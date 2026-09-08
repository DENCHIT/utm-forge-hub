-- =====================================================================
-- ZOBY Present - complete database setup, in one file.
--
-- Paste the whole thing into the Supabase SQL Editor and run it. No CLI
-- needed. It creates the schema, security policies, functions, and the
-- demo event (join code ZOBY26).
-- =====================================================================


-- ======================= 0001_init.sql =======================

-- ZOBY Present - core schema
-- Multi-tenant from day one: everything hangs off an organisation.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- organisations

create table public.orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  -- Brand tokens consumed by the presenter/audience themes. See src/lib/theme.ts.
  brand       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table public.org_members (
  org_id      uuid not null references public.orgs(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ---------------------------------------------------------------- events & sessions

-- An event is one appearance: a keynote, a workshop day, a conference track.
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs(id) on delete cascade,
  name        text not null,
  -- Short code the audience types or lands on via QR: /join/ABC123
  join_code   text not null unique check (join_code ~ '^[A-Z0-9]{4,10}$'),
  -- Open the doors. Audience endpoints refuse to read or write when false.
  is_live     boolean not null default false,
  theme       jsonb not null default '{}'::jsonb,
  starts_at   timestamptz,
  created_at  timestamptz not null default now()
);

create index events_org_idx on public.events (org_id);

-- A session is one slot on stage. An event has many (yours has three).
create table public.sessions (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  title       text not null,
  subtitle    text,
  position    integer not null default 0,
  status      text not null default 'draft' check (status in ('draft', 'live', 'complete')),
  -- Which slide the presenter is on. Every audience device follows this.
  current_slide_id uuid,
  created_at  timestamptz not null default now()
);

create index sessions_event_idx on public.sessions (event_id, position);

-- ---------------------------------------------------------------- slides

-- `type` drives which renderer runs; `content` is that renderer's props.
-- Adding a slide type means adding a renderer, not a migration.
create table public.slides (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  position    integer not null default 0,
  type        text not null check (type in (
                'title', 'text', 'bullets', 'quote', 'table', 'chart',
                'image', 'video', 'embed', 'collect', 'cluster', 'vote', 'results'
              )),
  content     jsonb not null default '{}'::jsonb,
  notes       text,
  -- Interactive slides only. The presenter advances this; audiences react.
  phase       text not null default 'idle' check (phase in (
                'idle', 'collecting', 'clustering', 'shortlist', 'voting', 'results'
              )),
  created_at  timestamptz not null default now()
);

create index slides_session_idx on public.slides (session_id, position);

alter table public.sessions
  add constraint sessions_current_slide_fk
  foreign key (current_slide_id) references public.slides(id) on delete set null;

-- ---------------------------------------------------------------- audience

-- Anonymous by default. The browser mints a token and keeps it in localStorage,
-- so a phone keeps its identity across a reload without anyone signing in.
create table public.participants (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  token        text not null,
  display_name text,
  created_at   timestamptz not null default now(),
  unique (event_id, token)
);

create table public.submissions (
  id             uuid primary key default gen_random_uuid(),
  slide_id       uuid not null references public.slides(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  body           text not null check (char_length(btrim(body)) between 3 and 500),
  -- Set by the clustering run; null until the AI has grouped this one.
  cluster_id     uuid,
  created_at     timestamptz not null default now()
);

create index submissions_slide_idx on public.submissions (slide_id, created_at);

-- One AI-derived group of submissions.
create table public.clusters (
  id          uuid primary key default gen_random_uuid(),
  slide_id    uuid not null references public.slides(id) on delete cascade,
  label       text not null,
  summary     text,
  -- Position 0-2 for the three finalists; null for the rest.
  rank        integer,
  is_finalist boolean not null default false,
  accent      text,
  created_at  timestamptz not null default now()
);

create index clusters_slide_idx on public.clusters (slide_id);

alter table public.submissions
  add constraint submissions_cluster_fk
  foreign key (cluster_id) references public.clusters(id) on delete set null;

create table public.votes (
  id             uuid primary key default gen_random_uuid(),
  slide_id       uuid not null references public.slides(id) on delete cascade,
  cluster_id     uuid not null references public.clusters(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  created_at     timestamptz not null default now(),
  -- One vote per person per voting slide. Changing your mind is an update.
  unique (slide_id, participant_id)
);

create index votes_slide_idx on public.votes (slide_id, cluster_id);

-- ---------------------------------------------------------------- helpers

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

-- True when the slide belongs to an event that is currently open to an audience.
create or replace function public.slide_is_open(target_slide uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.slides sl
    join public.sessions se on se.id = sl.session_id
    join public.events e on e.id = se.event_id
    where sl.id = target_slide and e.is_live
  );
$$;

create or replace function public.slide_phase(target_slide uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select phase from public.slides where id = target_slide;
$$;

-- ---------------------------------------------------------------- RLS

alter table public.orgs         enable row level security;
alter table public.org_members  enable row level security;
alter table public.events       enable row level security;
alter table public.sessions     enable row level security;
alter table public.slides       enable row level security;
alter table public.participants enable row level security;
alter table public.submissions  enable row level security;
alter table public.clusters     enable row level security;
alter table public.votes        enable row level security;

-- Staff: full control over their own organisation's content.
create policy orgs_member_read on public.orgs
  for select using (public.is_org_member(id));

create policy org_members_self_read on public.org_members
  for select using (user_id = auth.uid());

create policy events_member_all on public.events
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy sessions_member_all on public.sessions
  for all using (exists (
    select 1 from public.events e where e.id = event_id and public.is_org_member(e.org_id)
  )) with check (exists (
    select 1 from public.events e where e.id = event_id and public.is_org_member(e.org_id)
  ));

create policy slides_member_all on public.slides
  for all using (exists (
    select 1 from public.sessions s join public.events e on e.id = s.event_id
    where s.id = session_id and public.is_org_member(e.org_id)
  )) with check (exists (
    select 1 from public.sessions s join public.events e on e.id = s.event_id
    where s.id = session_id and public.is_org_member(e.org_id)
  ));

create policy clusters_member_all on public.clusters
  for all using (exists (
    select 1 from public.slides sl
    join public.sessions se on se.id = sl.session_id
    join public.events e on e.id = se.event_id
    where sl.id = slide_id and public.is_org_member(e.org_id)
  )) with check (exists (
    select 1 from public.slides sl
    join public.sessions se on se.id = sl.session_id
    join public.events e on e.id = se.event_id
    where sl.id = slide_id and public.is_org_member(e.org_id)
  ));

create policy submissions_member_all on public.submissions
  for all using (exists (
    select 1 from public.slides sl
    join public.sessions se on se.id = sl.session_id
    join public.events e on e.id = se.event_id
    where sl.id = slide_id and public.is_org_member(e.org_id)
  )) with check (exists (
    select 1 from public.slides sl
    join public.sessions se on se.id = sl.session_id
    join public.events e on e.id = se.event_id
    where sl.id = slide_id and public.is_org_member(e.org_id)
  ));

-- Audience: read-only on the live event, write only where the phase invites it.

create policy events_public_read on public.events
  for select using (is_live);

create policy sessions_public_read on public.sessions
  for select using (exists (
    select 1 from public.events e where e.id = event_id and e.is_live
  ));

create policy slides_public_read on public.slides
  for select using (public.slide_is_open(id));

create policy participants_public_insert on public.participants
  for insert with check (exists (
    select 1 from public.events e where e.id = event_id and e.is_live
  ));

create policy participants_public_read on public.participants
  for select using (exists (
    select 1 from public.events e where e.id = event_id and e.is_live
  ));

create policy submissions_public_read on public.submissions
  for select using (public.slide_is_open(slide_id));

create policy submissions_public_insert on public.submissions
  for insert with check (
    public.slide_is_open(slide_id) and public.slide_phase(slide_id) = 'collecting'
  );

create policy clusters_public_read on public.clusters
  for select using (public.slide_is_open(slide_id));

create policy votes_public_read on public.votes
  for select using (public.slide_is_open(slide_id));

create policy votes_public_write on public.votes
  for insert with check (
    public.slide_is_open(slide_id) and public.slide_phase(slide_id) = 'voting'
  );

create policy votes_public_update on public.votes
  for update using (
    public.slide_is_open(slide_id) and public.slide_phase(slide_id) = 'voting'
  );

-- ---------------------------------------------------------------- realtime

alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.slides;
alter publication supabase_realtime add table public.submissions;
alter publication supabase_realtime add table public.clusters;
alter publication supabase_realtime add table public.votes;

-- Vote tallies change on every tap; send the whole row so the screen can
-- recompute without a round trip.
alter table public.votes replica identity full;
alter table public.submissions replica identity full;
alter table public.clusters replica identity full;

-- ======================= 0002_upvotes_and_resilience.sql =======================

-- Contingencies for a quiet room and a hostile network.
--
-- 1. Upvoting other people's problems. The lowest-effort way to take part, and
--    it turns 8 submissions into a room full of signal.
-- 2. Provenance on submissions, so seeded and presenter-entered problems are
--    labelled on screen rather than passing as live audience activity.

-- ---------------------------------------------------------------- provenance

alter table public.submissions
  add column source text not null default 'audience'
    check (source in ('audience', 'seed', 'presenter'));

comment on column public.submissions.source is
  'audience = typed on a phone during the session; seed = gathered before the '
  'event (pre-event survey, prior room, desk research); presenter = taken '
  'verbally from the room and typed in by the speaker. The stage labels the '
  'non-audience ones - never present a seed as a live submission.';

-- Optional attribution shown on the card, e.g. "Pre-event survey".
alter table public.submissions add column source_label text;

-- ---------------------------------------------------------------- upvotes

create table public.submission_votes (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  -- Denormalised so the audience can subscribe to one slide's upvotes without
  -- joining through submissions on every realtime event.
  slide_id       uuid not null references public.slides(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (submission_id, participant_id)
);

create index submission_votes_slide_idx on public.submission_votes (slide_id);
create index submission_votes_submission_idx on public.submission_votes (submission_id);

alter table public.submission_votes enable row level security;
alter table public.submission_votes replica identity full;

create policy submission_votes_public_read on public.submission_votes
  for select using (public.slide_is_open(slide_id));

-- Upvoting stays open through the shortlist, so the room keeps voting on each
-- other's problems while the grouping runs.
create policy submission_votes_public_write on public.submission_votes
  for insert with check (
    public.slide_is_open(slide_id)
    and public.slide_phase(slide_id) in ('collecting', 'clustering', 'shortlist')
  );

create policy submission_votes_public_delete on public.submission_votes
  for delete using (
    public.slide_is_open(slide_id)
    and public.slide_phase(slide_id) in ('collecting', 'clustering', 'shortlist')
  );

create policy submission_votes_member_all on public.submission_votes
  for all using (exists (
    select 1 from public.slides sl
    join public.sessions se on se.id = sl.session_id
    join public.events e on e.id = se.event_id
    where sl.id = slide_id and public.is_org_member(e.org_id)
  )) with check (exists (
    select 1 from public.slides sl
    join public.sessions se on se.id = sl.session_id
    join public.events e on e.id = se.event_id
    where sl.id = slide_id and public.is_org_member(e.org_id)
  ));

alter publication supabase_realtime add table public.submission_votes;

-- ---------------------------------------------------------------- presenter capture

-- The speaker types in problems shouted from the floor. Allowed during
-- collecting only, and always marked as presenter-entered.
create policy submissions_presenter_insert on public.submissions
  for insert with check (
    source in ('presenter', 'seed')
    and exists (
      select 1 from public.slides sl
      join public.sessions se on se.id = sl.session_id
      join public.events e on e.id = se.event_id
      where sl.id = slide_id and public.is_org_member(e.org_id)
    )
  );

-- ======================= 0003_contacts_and_privacy.sql =======================

-- Email capture, plus a fix for a hole that email capture would have widened.
--
-- `participants` was readable by anyone on a live event, and it holds each
-- device's identity token. Anyone who could read the table could take another
-- person's token and vote as them. Adding an email column there would have put
-- the whole room's addresses behind the same anon key. So: participants become
-- staff-only, the phone gets a security-definer function to claim its row, and
-- emails live in their own write-only table.

-- ---------------------------------------------------------------- close the leak

drop policy if exists participants_public_read on public.participants;
drop policy if exists participants_public_insert on public.participants;

create policy participants_member_read on public.participants
  for select using (exists (
    select 1 from public.events e
    where e.id = event_id and public.is_org_member(e.org_id)
  ));

-- The phone claims (or re-claims) its anonymous row through this instead of
-- selecting the table. Returns only the caller's own id, never anyone else's.
create or replace function public.claim_participant(p_event_id uuid, p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.events where id = p_event_id and is_live) then
    raise exception 'Event is not open.';
  end if;

  if p_token is null or char_length(p_token) not between 8 and 64 then
    raise exception 'Invalid token.';
  end if;

  insert into public.participants (event_id, token)
  values (p_event_id, p_token)
  on conflict (event_id, token) do update set token = excluded.token
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.claim_participant(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------- stage clock

-- How long this slot is meant to run. Drives the colour of the stage clock:
-- white while there is room, amber near the end, red once over.
alter table public.sessions add column target_minutes integer;

-- ---------------------------------------------------------------- contacts

-- Someone who asked to hear back when their problem gets covered.
--
-- Deliberately write-only from the audience side: a phone can add an address
-- but can never read the table, so the anon key is not a mailing-list export.
create table public.contacts (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  email          text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- When they ticked the box, and what they were told they were agreeing to.
  consent_at     timestamptz not null default now(),
  consent_text   text,
  -- Set once you have actually emailed them, so a second send skips them.
  notified_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (event_id, email)
);

create index contacts_event_idx on public.contacts (event_id);

alter table public.contacts enable row level security;

create policy contacts_member_all on public.contacts
  for all using (exists (
    select 1 from public.events e
    where e.id = event_id and public.is_org_member(e.org_id)
  )) with check (exists (
    select 1 from public.events e
    where e.id = event_id and public.is_org_member(e.org_id)
  ));

-- No public select, insert, or update policy: the audience reaches this table
-- only through the function below.

/**
 * Records an address, or updates it if that person already left one.
 *
 * Security definer because the audience has no rights on `contacts` at all -
 * this is the single, narrow door in. Returns nothing: a phone must not be
 * able to probe whether an address is already on the list.
 */
create or replace function public.leave_contact(
  p_event_id uuid,
  p_token text,
  p_email text,
  p_consent_text text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant uuid;
begin
  if not exists (select 1 from public.events where id = p_event_id and is_live) then
    raise exception 'Event is not open.';
  end if;

  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'That does not look like an email address.';
  end if;

  select id into v_participant
  from public.participants
  where event_id = p_event_id and token = p_token;

  insert into public.contacts (event_id, participant_id, email, consent_text)
  values (p_event_id, v_participant, lower(btrim(p_email)), p_consent_text)
  on conflict (event_id, email) do update
    set participant_id = coalesce(excluded.participant_id, public.contacts.participant_id),
        consent_at     = now(),
        consent_text   = excluded.consent_text;
end;
$$;

grant execute on function public.leave_contact(uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- follow-up view

/**
 * Everything you need to run the follow-up: every submission, who to tell, and
 * which theme it landed in.
 *
 * Built for the session-2 workflow - answering problems from the stage - and
 * for exporting the whole set to build assets against afterwards. Staff-only,
 * because it joins submissions to email addresses.
 */
create or replace view public.submission_export
with (security_invoker = true)
as
select
  e.id                as event_id,
  e.name              as event_name,
  se.id               as session_id,
  se.title            as session_title,
  sl.id               as slide_id,
  s.id                as submission_id,
  s.body,
  s.source,
  s.source_label,
  s.created_at,
  c.id                as cluster_id,
  c.label             as cluster_label,
  c.is_finalist,
  c.rank              as cluster_rank,
  coalesce(uv.upvotes, 0) as upvotes,
  ct.email,
  ct.notified_at
from public.submissions s
join public.slides sl   on sl.id = s.slide_id
join public.sessions se on se.id = sl.session_id
join public.events e    on e.id = se.event_id
left join public.clusters c on c.id = s.cluster_id
left join public.participants p on p.id = s.participant_id
left join public.contacts ct on ct.participant_id = p.id
left join (
  select submission_id, count(*)::int as upvotes
  from public.submission_votes
  group by submission_id
) uv on uv.submission_id = s.id;

comment on view public.submission_export is
  'Staff-only follow-up view: every submission with its theme, backing, and '
  'the address of whoever asked to hear back. security_invoker means the '
  'caller''s RLS applies, so the audience anon key sees nothing.';

-- ======================= 0004_moderation.sql =======================

-- Moderation.
--
-- Anything typed on a phone lands on a large screen behind the speaker, who is
-- facing away from it. Without this, the first the room's host hears about an
-- obscene or abusive submission is the laughter. Submissions now arrive
-- `pending` and reach the wall only once something has cleared them.
--
-- The default is fail-closed: an unscreened submission does not display. The
-- speaker can override that per slide (see `moderation` on the collect slide)
-- because a dead network must not mean an empty wall - see the note on the
-- trigger below.

alter table public.submissions
  add column status text not null default 'pending'
    check (status in ('pending', 'approved', 'flagged', 'hidden'));

-- Why the screener flagged it, so a human can overrule quickly.
alter table public.submissions add column moderation_reason text;

create index submissions_status_idx on public.submissions (slide_id, status);

comment on column public.submissions.status is
  'pending = not yet screened, never shown on stage; approved = on the wall; '
  'flagged = the screener objected, held for a human; hidden = a human pulled '
  'it, including via the panic button on the remote.';

-- ---------------------------------------------------------------- entry policy

/**
 * Decides the status of a new submission, ignoring whatever the client asked
 * for. A phone cannot self-approve.
 *
 * Reads `content->>'moderation'` on the collect slide:
 *   'ai'     (default) - hold as pending until the screener clears it
 *   'manual'           - hold as pending for the speaker to release by hand
 *   'off'              - straight to the wall
 *
 * 'off' exists for the network contingency: if the venue wifi is dead the
 * screener cannot run, and a wall that stays empty all session is worse than
 * an unscreened one at a small internal event. It is a deliberate choice the
 * speaker makes, not a silent fallback.
 *
 * Anything the speaker or an organiser types is trusted and goes straight up.
 */
create or replace function public.set_submission_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
begin
  if new.source in ('presenter', 'seed') then
    new.status := 'approved';
    return new;
  end if;

  select coalesce(sl.content->>'moderation', 'ai') into v_mode
  from public.slides sl
  where sl.id = new.slide_id;

  new.status := case when v_mode = 'off' then 'approved' else 'pending' end;
  return new;
end;
$$;

create trigger submissions_set_status
  before insert on public.submissions
  for each row execute function public.set_submission_status();

-- ---------------------------------------------------------------- read policy

-- The audience and the stage see approved submissions only. Everything else is
-- visible to staff, through the existing member policy.
drop policy if exists submissions_public_read on public.submissions;

create policy submissions_public_read on public.submissions
  for select using (public.slide_is_open(slide_id) and status = 'approved');

-- Upvotes follow the same rule: nothing pending can be backed into visibility.
drop policy if exists submission_votes_public_write on public.submission_votes;

create policy submission_votes_public_write on public.submission_votes
  for insert with check (
    public.slide_is_open(slide_id)
    and public.slide_phase(slide_id) in ('collecting', 'clustering', 'shortlist')
    and exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.status = 'approved'
    )
  );

-- ---------------------------------------------------------------- panic button

/**
 * Pulls a submission off the wall immediately, and takes its upvotes with it so
 * the count on screen stays honest.
 *
 * Staff only. The remote calls this on a long-press; it is the thing you reach
 * for when something is on a ten-foot screen behind your head.
 */
create or replace function public.hide_submission(p_submission_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.submissions s
    join public.slides sl on sl.id = s.slide_id
    join public.sessions se on se.id = sl.session_id
    join public.events e on e.id = se.event_id
    where s.id = p_submission_id and public.is_org_member(e.org_id)
  ) then
    raise exception 'Not yours to hide.';
  end if;

  update public.submissions
  set status = 'hidden',
      moderation_reason = coalesce(p_reason, 'Pulled by the presenter'),
      cluster_id = null
  where id = p_submission_id;

  delete from public.submission_votes where submission_id = p_submission_id;
end;
$$;

grant execute on function public.hide_submission(uuid, text) to authenticated;

/** Clears the whole wall at once. The break-glass option. */
create or replace function public.hide_all_submissions(p_slide_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1 from public.slides sl
    join public.sessions se on se.id = sl.session_id
    join public.events e on e.id = se.event_id
    where sl.id = p_slide_id and public.is_org_member(e.org_id)
  ) then
    raise exception 'Not yours to clear.';
  end if;

  update public.submissions
  set status = 'hidden', moderation_reason = 'Wall cleared by the presenter'
  where slide_id = p_slide_id and status = 'approved';

  get diagnostics v_count = row_count;

  delete from public.submission_votes where slide_id = p_slide_id;
  return v_count;
end;
$$;

grant execute on function public.hide_all_submissions(uuid) to authenticated;

-- ---------------------------------------------------------------- backfill

-- Everything that existed before moderation was already on the wall.
update public.submissions set status = 'approved' where status = 'pending';

-- ======================= seed.sql =======================

-- Demo content: one event, three stage sessions, and a full interaction run
-- wired end to end. Safe to re-run: it clears the ZOBY demo org first.
--
-- After running, add yourself to the org so the admin UI can see it:
--   insert into public.org_members (org_id, user_id, role)
--   select id, '<your auth.users id>', 'owner' from public.orgs where slug = 'zoby';

do $$
declare
  v_org      uuid;
  v_event    uuid;
  v_s1       uuid;
  v_s2       uuid;
  v_s3       uuid;
  v_collect  uuid;
  v_first    uuid;
begin
  delete from public.orgs where slug = 'zoby';

  insert into public.orgs (name, slug, brand)
  values (
    'ZOBY',
    'zoby',
    -- Bare HSL triples so Tailwind's alpha modifiers keep working.
    '{"brand": "255 92% 68%", "accent": "322 90% 62%", "canvas": "244 30% 5%"}'::jsonb
  )
  returning id into v_org;

  insert into public.events (org_id, name, join_code, is_live, starts_at)
  values (v_org, 'ZOBY on stage', 'ZOBY26', false, now())
  returning id into v_event;

  insert into public.sessions (event_id, title, subtitle, position, status, target_minutes) values
    (v_event, 'Session 1 — The problem',  'Where the room actually hurts', 0, 'draft', 20)
    returning id into v_s1;
  insert into public.sessions (event_id, title, subtitle, position, status, target_minutes) values
    (v_event, 'Session 2 — The evidence', 'What the study found',          1, 'draft', 20)
    returning id into v_s2;
  insert into public.sessions (event_id, title, subtitle, position, status, target_minutes) values
    (v_event, 'Session 3 — The answer',   'What we do on Monday',          2, 'draft', 15)
    returning id into v_s3;

  -- ---------------------------------------------------------- session 1
  -- Opens with the audience interaction: capture, group, shortlist, vote, reveal.

  insert into public.slides (session_id, position, type, content, notes) values
    (v_s1, 0, 'title', jsonb_build_object(
      'eyebrow', 'ZOBY',
      'heading', 'What is actually stopping you?',
      'subheading', 'Ten minutes. Your problems. The room decides.'
    ), 'Hold here while people settle. Do not start until the back row looks up.')
    returning id into v_first;

  insert into public.slides (session_id, position, type, content, notes)
  values (v_s1, 1, 'collect', jsonb_build_object(
    'heading', 'What is getting in your way?',
    'prompt', 'One problem. Be specific. As many as you like.',
    'placeholder', 'Type your problem…',
    'clustering_context',
      'Group by the underlying operational problem people face in their own work. ' ||
      'Ignore vendor names and industry commentary.',
    'audience_context', 'Marketing and growth leaders at mid-size B2B companies.',
    'finalistCount', 3,
    'examples', jsonb_build_array(
      'Nobody can agree what the data means',
      'Everything takes three approvals',
      'We ship, then never hear anything back'
    ),
    'allowUpvotes', true,
    'moderation', 'ai',
    'notifyConsentText',
      'Email me when there is an answer to my problem. My address is used for ' ||
      'that and nothing else, and I can unsubscribe from any email.'
  ), 'Open submissions from the remote. Wait for the count to plateau — usually 90 seconds.')
  returning id into v_collect;

  -- Seeded problems, on the wall from the first second and labelled as such.
  --
  -- These exist so the room never sees an empty screen, and so people who
  -- arrived without a problem in mind have something to back straight away.
  -- They are marked source = 'seed' and carry a visible label on the stage and
  -- on every phone. Replace the text with real answers from your own pre-event
  -- survey before the day — do not present invented problems as gathered ones.
  insert into public.submissions (slide_id, body, source, source_label) values
    (v_collect, 'We cannot tell which channel actually drove the pipeline',
      'seed', 'Pre-event survey'),
    (v_collect, 'Every campaign needs sign-off from three people who are never free',
      'seed', 'Pre-event survey'),
    (v_collect, 'We produce a lot of content and have no idea if any of it works',
      'seed', 'Pre-event survey'),
    (v_collect, 'Sales says the leads are rubbish, we say they never follow up',
      'seed', 'Pre-event survey');

  insert into public.slides (session_id, position, type, content, notes) values
    (v_s1, 2, 'cluster', jsonb_build_object(
      'heading', 'Here is what you all said',
      'sourceSlideId', v_collect
    ), 'Hit "Group problems with AI" on the remote. Talk over the animation.'),

    (v_s1, 3, 'cluster', jsonb_build_object(
      'heading', 'The three that matter',
      'sourceSlideId', v_collect
    ), 'Set the phase to "Show top 3". Read each one out.'),

    (v_s1, 4, 'vote', jsonb_build_object(
      'heading', 'Which one do we solve?',
      'question', 'One vote each. You can change it until we close.',
      'sourceSlideId', v_collect,
      'countdownSeconds', 60
    ), 'Open voting. The clock is advisory — you close it, not the timer.'),

    (v_s1, 5, 'results', jsonb_build_object(
      'heading', 'The room has decided',
      'sourceSlideId', v_collect
    ), 'Reveal the winner, then pause. Let the number land before you speak.');

  update public.sessions set current_slide_id = v_first where id = v_s1;

  -- ---------------------------------------------------------- session 2
  -- The study. Swap the numbers for your real ones before the day.

  insert into public.slides (session_id, position, type, content, notes) values
    (v_s2, 0, 'title', jsonb_build_object(
      'eyebrow', 'The study',
      'heading', 'We asked 500 of you',
      'subheading', 'Here is what came back'
    ), null),

    (v_s2, 1, 'chart', jsonb_build_object(
      'heading', 'Before and after',
      'variant', 'bar',
      'categoryKey', 'label',
      'series', jsonb_build_array(
        jsonb_build_object('name', 'Before'),
        jsonb_build_object('name', 'After')
      ),
      'rows', jsonb_build_array(
        jsonb_build_object('label', 'Segment A', 'Before', 42, 'After', 61),
        jsonb_build_object('label', 'Segment B', 'Before', 30, 'After', 52),
        jsonb_build_object('label', 'Segment C', 'Before', 55, 'After', 58)
      ),
      'valueSuffix', '%',
      'caption', 'n = 500, fielded 2026. Replace with your real figures.'
    ), 'The gap on Segment B is the whole story. Point at it.'),

    (v_s2, 2, 'table', jsonb_build_object(
      'heading', 'The full picture',
      'columns', jsonb_build_array('Segment', 'Before', 'After', 'Change'),
      'rows', jsonb_build_array(
        jsonb_build_array('Segment A', 42, 61, '+19pts'),
        jsonb_build_array('Segment B', 30, 52, '+22pts'),
        jsonb_build_array('Segment C', 55, 58, '+3pts')
      ),
      'highlightColumn', 3
    ), null),

    (v_s2, 3, 'quote', jsonb_build_object(
      'quote', 'We knew it was bad. We did not know it was this bad.',
      'attribution', 'A respondent, verbatim'
    ), null);

  -- ---------------------------------------------------------- session 3

  insert into public.slides (session_id, position, type, content, notes) values
    (v_s3, 0, 'title', jsonb_build_object(
      'eyebrow', 'What now',
      'heading', 'Three things to do on Monday'
    ), null),

    (v_s3, 1, 'bullets', jsonb_build_object(
      'heading', 'Three things to do on Monday',
      'items', jsonb_build_array(
        'The first thing',
        'The second thing',
        'The third thing'
      ),
      'reveal', true
    ), 'Reveal one at a time — right arrow steps through them.'),

    (v_s3, 2, 'title', jsonb_build_object(
      'heading', 'Thank you',
      'subheading', 'Come and find me at the stand'
    ), null);
end $$;

-- =====================================================================
-- LAST STEP. The app shows nothing without it.
--
-- Row-level security means a signed-in user sees no events until they
-- belong to an organisation. After you have signed into the app once:
--
--   Dashboard -> Authentication -> Users -> copy your user UUID
--
-- then run this with your UUID pasted in:
--
--   insert into public.org_members (org_id, user_id, role)
--   select id, 'PASTE-YOUR-USER-UUID-HERE', 'owner'
--   from public.orgs where slug = 'zoby';
-- =====================================================================
