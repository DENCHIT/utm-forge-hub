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
