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
