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

  insert into public.sessions (event_id, title, subtitle, position, status) values
    (v_event, 'Session 1 — The problem',  'Where the room actually hurts', 0, 'draft')
    returning id into v_s1;
  insert into public.sessions (event_id, title, subtitle, position, status) values
    (v_event, 'Session 2 — The evidence', 'What the study found',          1, 'draft')
    returning id into v_s2;
  insert into public.sessions (event_id, title, subtitle, position, status) values
    (v_event, 'Session 3 — The answer',   'What we do on Monday',          2, 'draft')
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
    'allowUpvotes', true
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
