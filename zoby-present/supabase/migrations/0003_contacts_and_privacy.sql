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
