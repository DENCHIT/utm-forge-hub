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
