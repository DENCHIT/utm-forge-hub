# Handoff

State of play as of 8 September 2026, for picking this up in a fresh session.

## What this is

**ZOBY Present** — a live presentation tool. Ed is on stage at the end of
September with three sessions. The app runs the slides *and* the audience
interaction: people scan a QR code, submit the problems they're facing, Claude
groups them into themes live on screen, the room votes on the top three, and the
winner is revealed. It's intended to be sold on later, so it's multi-tenant with
row-level security throughout.

Built in one session. It typechecks, lints, and builds clean. **None of it has
run against a real Supabase project yet** — that is the immediate job.

## Where the code is

Currently in a `zoby-present/` subfolder on branch
`claude/zoby-presentation-tool-vcn951` of `DENCHIT/utm-forge-hub`.

It belongs at the **root** of `DENCHIT/zoby-present` (already created on GitHub,
contents unknown — Hostinger reported "missing package.json", which suggests it's
empty or nested).

## The stack

- Vite + React + TypeScript + Tailwind, framer-motion for animation, Recharts
  for the study charts.
- Supabase: Postgres, Realtime, Edge Functions, magic-link auth.
- Claude via two Edge Functions — `cluster-problems` (Opus, groups submissions)
  and `screen-submissions` (Haiku, moderation).
- Supabase project ref: `rtdumazuuswjrjpuiuaw`

## Routes

| Route | Who |
|---|---|
| `/present/:sessionId` | Projector |
| `/control/:sessionId` | Presenter's phone |
| `/join/:code` | Audience |
| `/events/:eventId` | Deck builder |
| `/events/:eventId/submissions` | All problems, emails, CSV export |

`sessions.current_slide_id` is the single source of truth for where the room is;
everything follows it over Realtime.

## Jobs, in order

### 1. Get the code into its own repo

Files at the root, no `zoby-present/` wrapper. Check what's actually in
`DENCHIT/zoby-present` first.

### 2. Database

Paste `supabase/setup-all.sql` into the Supabase SQL Editor and run it. It's the
four migrations plus the seed, concatenated. Verified against Postgres 16:
1 org, 1 event (join code `ZOBY26`), 3 sessions, 13 slides, 4 seeded
submissions, RLS on 11 tables, 23 policies.

### 3. Grant access

RLS means a signed-in user sees nothing until they're an org member. Sign into
the app once, get the UUID from Authentication → Users, then:

```sql
insert into public.org_members (org_id, user_id, role)
select id, 'THE-UUID', 'owner' from public.orgs where slug = 'zoby';
```

### 4. Edge Functions

```bash
supabase link --project-ref rtdumazuuswjrjpuiuaw
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy cluster-problems
supabase functions deploy screen-submissions
```

Both are required. Without `screen-submissions` nothing clears moderation and
the submission wall stays empty — that's deliberate (fail-closed), but it looks
like a bug if you don't know.

### 5. Deploy

Vercel, pointed at the repo. Env vars:

```
VITE_SUPABASE_URL=https://rtdumazuuswjrjpuiuaw.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key, sb_publishable_...>
VITE_PUBLIC_APP_URL=<the live domain>
```

`vercel.json` is already in the repo. Hostinger's git integration was tried and
won't work — it copies files without building. `.github/workflows/build.yml`
exists as a fallback for that case: it builds and force-pushes to a `deploy`
branch a file-copy host can serve.

### 6. Test

End to end: open the doors on the event, go live on session one, projector on
`/present/:id`, remote on `/control/:id`, phone on `/join/ZOBY26`. Submit,
group, shortlist, vote, reveal.

Then the one that catches the classic failure — load
`https://domain/join/ZOBY26` **directly in a fresh tab**. If that 404s, SPA
routing is broken and the QR code won't work on the day.

## Open items

- **Rotate the Supabase secret key.** `sb_secret_...` was pasted into a chat.
  It bypasses every RLS policy. Nothing in the project needs its value —
  Supabase injects it into Edge Functions at runtime.
- Replace the seeded pre-event problems in `seed.sql` with real survey answers,
  or delete them. They're labelled "Pre-event survey" on screen.
- Replace the demo study figures in session two.
- Set each session's slot length in the deck builder so the stage clock works.
- Rehearse on the venue network.

## Next features, in the order agreed

1. **Rehearsal mode** — simulate ~200 phones submitting at realistic speed, to
   practise the run and see the wall at genuine volume before the day.
2. **Per-type slide forms** — the deck builder currently edits slide content as
   raw JSON. Fine for testing, miserable for building the real deck.
3. **CSV → chart slide** — paste study results rather than hand-writing JSON.

Then, product-side: cross-session callbacks (session 3 opens with the problem
session 1 voted for), a before/after audience pulse, a post-session results page
behind a QR on the final slide, and packaging the whole capture → group → vote →
follow-up run as a reusable format template.

## Things worth knowing before changing anything

- **Moderation fails closed.** Submissions land `pending` and are invisible
  until screened. A database trigger sets the status, so a phone can't
  self-approve. `moderation: "off"` per collect slide exists for a dead network.
- **Seeded and presenter-entered submissions are labelled on screen** and that's
  deliberate — a wall padded with unlabelled invented activity is a
  reputational risk in a room where people watch their own words appear.
- **`participants` is staff-only.** It holds each device's identity token; a
  readable version let any phone vote as someone else. Phones claim their row
  via `claim_participant`.
- **Email addresses are write-only from the audience side** — `contacts` has no
  public policies at all, reached only through `leave_contact`. The consent
  wording shown is stored per row.
- **Upvotes are the participation strategy.** Most people won't type a problem
  but will back one. Grouping ranks themes by total backing, not submission
  count.

`README.md` covers the design decisions; `SETUP.md` is the step-by-step.
