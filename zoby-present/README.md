# ZOBY Present

A live presentation tool built for one job: run a session from the stage while
the audience takes part from their phones.

- **Slides** — title, text, bullets, quote, table, chart, image, video, embed.
- **Capture** — the audience scans a QR code and types in their problems. They
  land on the screen as they arrive.
- **Group** — Claude clusters the submissions into themes, live, with the cards
  physically migrating into their groups on screen.
- **Shortlist** — the top themes go through. You control how many, and you steer
  what kinds of problem the model should surface.
- **Vote** — the audience picks one. Bars stay hidden until you reveal, so
  nobody votes with the herd.
- **Reveal** — the winner separates itself.

Everything is themed from CSS variables and scoped to an organisation, so the
same deployment can run someone else's event under their brand.

## The three screens

| Route | Who | What it does |
|---|---|---|
| `/present/:sessionId` | The projector | Full-screen deck. Mirror it and leave it alone. |
| `/control/:sessionId` | Your phone | Next/back, speaker notes, phase control, the AI grouping button, live counts. |
| `/join/:code` | The audience | Where the QR code lands. Follows the stage automatically. |
| `/events/:eventId` | You, beforehand | Deck builder. |
| `/events/:eventId/submissions` | You, during and after | Every problem, searchable, with emails and CSV export. |

The room's position is `sessions.current_slide_id`. Every device watches it over
Supabase Realtime, so a phone that joins late lands on the right screen straight
away.

## Setup

### 1. Supabase

```bash
supabase link --project-ref <your-ref>
supabase db push                        # applies supabase/migrations
psql "$DATABASE_URL" -f supabase/seed.sql   # optional demo event
```

Then add yourself to the demo organisation so the admin UI can see it:

```sql
insert into public.org_members (org_id, user_id, role)
select id, '<your auth.users id>', 'owner' from public.orgs where slug = 'zoby';
```

### 2. The clustering function

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy cluster-problems
supabase functions deploy screen-submissions
```

Both must be deployed. Without `screen-submissions` nothing clears moderation
and the wall stays empty — see the Moderation section.

The key stays server-side. The function checks the caller is a signed-in member
of the event's organisation before it will run.

### 3. The app

```bash
cp .env.example .env     # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

`VITE_PUBLIC_APP_URL` sets the origin baked into the QR codes. Leave it unset
locally; set it to your real domain in production.

## Deploying

This is a Vite app: the browser cannot run the source. Something has to run
`npm run build` and serve the `dist/` folder. Almost every deployment problem
with this app is one of those two things.

Two rules that matter more than the host you pick:

1. **Serve `dist/`, never the repository root.** Pointing a web root at the
   source serves TypeScript, which does nothing.
2. **Every unknown path must fall back to `index.html`.** There is no
   `/join/ZOBY26` file on disk — the app makes that route up in the browser. A
   host without this rule serves the home page fine and 404s the QR code, which
   is the one link that has to work.

Config for the common hosts is in the repo: `vercel.json`, `netlify.toml`,
`public/_redirects` (Netlify and Cloudflare Pages), and `public/.htaccess`
(Apache and LiteSpeed, which is what most shared hosting runs). The last two are
copied into `dist/` by the build, so they ship with the site.

### Hosts that build for you

Vercel, Netlify and Cloudflare Pages: connect the repository, point at `main`,
and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's
environment variables. Build command `npm run build`, output `dist` — the config
files above set that already.

This is the recommended route for a live event: a push rebuilds automatically,
and you can roll back to a previous deploy in one click if something breaks an
hour before you go on.

### Hosts that only copy files (Hostinger, cPanel, plain FTP)

Shared hosting git integrations copy the repository into the web root. They do
not run `npm install` or `npm run build`, so pointing one at `main` serves raw
source and nothing works.

`.github/workflows/build.yml` solves this: every push to `main` builds the app
and force-pushes the result to a **`deploy`** branch. Point the host's git
integration at `deploy` instead of `main` and it copies a working build.

Set up once:

1. In GitHub: **Settings → Secrets and variables → Actions**, add
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_PUBLIC_APP_URL`
   (your live domain, so the QR codes point at the right place).
2. Push to `main`, or run the workflow manually, and let it create `deploy`.
3. In the host: connect the repository, choose the **`deploy`** branch, web root
   at the repository root.

`VITE_*` values are baked in at build time, so they belong in GitHub's secrets,
not on the web server. Setting them in the hosting panel does nothing.

The anon key is meant to be in the browser bundle — row-level security is what
protects the data, not the secrecy of that key. The service role key must never
go anywhere near this build.

### Doing it by hand

```bash
npm run build            # produces dist/
```

Upload the **contents** of `dist/` to the web root, including the hidden
`.htaccess`. Most FTP clients hide dotfiles by default, and a missing
`.htaccess` is the deep-link 404 again.

### Checking it worked

Open `https://yourdomain/join/ZOBY26` **directly**, not by clicking through from
the home page. If it loads, routing is right. If it 404s, the fallback rule is
missing. That single check catches the failure that matters, because it is the
exact thing six hundred phones are about to do at once.

## Running a session

1. In the deck builder, **Open the doors** on the event. Audience routes refuse
   to read or write until you do.
2. **Go live** on the session you are about to give. The audience follows
   whichever session is live.
3. Open `/present/:sessionId` on the projector, `/control/:sessionId` on your
   phone.
4. On the collect slide, hit **Open submissions**. Watch the count.
5. Hit **Group problems with AI**, then **Show top 3**.
6. **Open voting**, then **Reveal winner**.

Stage keys: `→`/`space` advance, `←` back, `F` fullscreen, `.` blank the screen,
`T` toggle the clock, `R` restart the clock.

## The stage clock

Bottom-left of the projector: wall clock, time remaining, and slide position.
Low contrast by design — readable from the confidence monitor, invisible from
row 20. It gets louder only when it matters: amber inside the last five minutes,
red and bold once you are over.

Set each session's slot length in minutes in the deck builder (the small field
next to *Go live*). With no slot length it just counts up.

The start time lives in the projector's `localStorage`, not the database, so a
browser reload mid-talk comes back showing the same elapsed time with no round
trip. `R` restarts it if you need to.

## Every problem, and following up

`/events/:eventId/submissions` — linked from the deck builder and from the
remote — is every submission across every session, searchable, sorted by
backing.

Two jobs:

- **On the day.** Open it in a second tab as the answering script for a
  question-and-answer session. Search it, work down by upvotes, see which theme
  each problem landed in.
- **Afterwards.** Filter and export CSV: problem, session, theme, whether it
  made the top three, upvote count, source, and the address of whoever asked to
  hear the answer. That is the build list for producing an asset per problem.

Mark people as emailed as you go, and the *Not emailed yet* filter becomes your
send queue.

### Email capture

Anyone who has submitted a problem is offered a field: leave an address and get
told when their problem is answered. It appears after they submit, not before —
asking first is just a lead form — and again on the results screen, which is the
strongest moment to ask.

How it is stored:

- Addresses live in `contacts`, which the audience has **no** rights on at all.
  Phones write through a `leave_contact` function and can never read the table,
  so the anon key is not a mailing-list export.
- The consent wording is the field's label, not a pre-ticked box, and the exact
  text shown is stored on each row (`consent_text`) so you can evidence months
  later what somebody agreed to. Set it per collect slide with
  `notifyConsentText`.
- `participants` is staff-only. It holds each device's identity token, and
  anyone who could read it could vote as somebody else. Phones claim their row
  through `claim_participant`.

You are collecting personal data at an event, so the usual applies: a privacy
notice people can reach, a real unsubscribe in every send, and only using the
addresses for what the consent text says. The schema supports that; the
promise is yours to keep.

## Building a deck

Slides are rows in `slides`; their `content` is JSON matching the shapes in
[`src/lib/types.ts`](src/lib/types.ts). The builder edits that JSON directly
against a live preview. Adding a new slide type means adding a renderer and a
template — never a migration.

The interaction slides (`cluster`, `vote`, `results`) each carry a
`sourceSlideId` pointing at the `collect` slide the submissions came from. That
indirection is what lets you split one interaction across as many screens as you
want, and revisit the result later in the deck.

### Steering the AI

On the `collect` slide:

- `clustering_context` — what kinds of problem you want surfaced, and what to
  ignore.
- `audience_context` — who is in the room, so the labels come back in their
  language.
- `finalistCount` — how many themes go through to the vote (default 3).

## Multi-tenancy

`orgs` → `events` → `sessions` → `slides`. Row-level security scopes staff to
their own organisation's content; the audience gets read-only access to a live
event and may only write where the current phase invites it (submissions during
`collecting`, votes during `voting`). Brand tokens live on `orgs.brand` and
`events.theme` and are painted onto CSS variables at runtime.

## Moderation

Anything typed on a phone lands on a large screen behind you, and you are facing
away from it. So nothing reaches the wall unscreened.

**How it works.** Submissions arrive `pending` and are invisible to everyone but
you. The phone fires the screener the moment it submits, so a normal problem
clears in the second between tapping send and looking up. Haiku does the
screening — this sits in a sub-second latency budget and does not need a bigger
model to meet it. Anything it objects to becomes `flagged` and waits for you.

**It fails closed.** If the screener cannot be reached, submissions stay pending
and off the wall. They appear in the remote's queue where you can release them
by hand, one tap each, with the text in front of you.

**The sweeper.** If a phone drops off mid-request its submission would sit
pending forever, so the remote sweeps any backlog itself. It runs only while
there is one, and backs off for six seconds between attempts.

**The panic button.** *Pull something off the wall* on the remote lists
everything currently up; one tap hides it and deletes its upvotes so the counts
stay honest. There is a *Clear the whole wall* underneath it. No confirmation
dialogue on the single-item hide — on stage there is no time to read one, and
putting something back is free.

**What gets blocked.** Slurs, harassment, sexual content, anything aimed at a
named individual, contact details and spam, and text trying to hijack the screen
by issuing instructions. Blunt, cynical and sweary-but-not-abusive descriptions
of work problems are explicitly allowed — you are asking people what frustrates
them, and sanitising that ruins the exercise. When the screener is unsure it
allows, because you review anything it blocks and over-blocking real answers is
its own failure.

**Modes.** Per collect slide, `moderation`:

- `ai` (default) — screen everything, hold what it objects to.
- `manual` — hold everything for you to release by hand.
- `off` — straight to the wall. Only for a trusted room, or when the network is
  down and an empty wall is the worse outcome. It is a decision you make, never
  a silent fallback.

Presenter-entered and seeded problems skip screening — they came from you.

## When the room is quiet

The realistic failure is not the wifi. It is eight submissions on a wall built
for three hundred. Five things address that:

1. **Upvotes.** The audience backs each other's problems with one tap, from the
   moment the first one lands and right through the grouping. Most people will
   never type a problem but will happily say "that one is mine too" — so eight
   submissions and ninety upvotes is a room that took part. The stage shows
   upvote badges, popular problems get a brighter edge, and the grouping ranks
   themes by total backing rather than how many people typed.
2. **Adaptive wall.** At four submissions the cards are large, centred and
   confident; at three hundred they are dense. A quiet room reads as a curated
   shortlist, not a flop. See `wallStyle` in `CollectStage.tsx`.
3. **Examples on the phone.** Tapping one fills the box to edit from. A blank
   textarea asks people to compose; an example asks them to react, which is a
   much easier thing to do in front of six hundred people.
4. **Presenter capture.** "Add one from the floor" on the remote — take a
   problem verbally and it goes straight on the wall, labelled *From the floor*.
5. **Seeded problems.** Pre-event survey answers loaded onto the wall before you
   start, labelled *Asked before today*. The room is never looking at an empty
   screen, and people have something to back in the first ten seconds.

### On seeding, deliberately

Seeded and presenter-entered submissions carry `source` and are **labelled on
the stage and on every phone**. That is not an oversight to be styled away. A
padded wall passed off as live audience activity is a story about you if anyone
works it out, and in a room where people can see their own submission appear,
somebody will. Seeded problems from a real pre-event survey are standard
facilitation practice and work fine when they are named as such. Replace the
demo seeds in `seed.sql` with genuine survey answers before the day.

## When the network is against you

Conference wifi is the second risk. What is in place:

- **Polling alongside realtime.** Venue networks block or throttle websockets
  routinely. `useInteraction` polls every 8 seconds regardless, so submissions
  still land on the stage when the socket is silently dead — just slower.
- **Connection badge on the remote** (never the stage). *Live*, *Slow — updates
  every 8s*, or *No network*, so you know whether the room has gone quiet
  because of the wifi or because nobody is engaged. Those need different
  responses from you and you have seconds to pick one.
- **On-device grouping fallback.** If the Edge Function or the Anthropic API is
  unreachable, the remote groups the submissions locally by keyword overlap and
  carries on. It is visibly rougher than the model — it misses two people
  describing the same pain in different words, which is the whole point of the
  AI — and the toast says so. It exists so you are never stuck on a spinner in
  front of an audience. See `src/lib/localClustering.ts`.
- **Screen wake lock** on the remote, so your phone does not lock mid-session.

Two things to do yourself: tether your laptop to your phone as the projector's
connection if the venue allows it, and rehearse once on the venue network.

## Things that make it land

- **Presence count** on stage — "182 in the room with us" proves it is live and
  is a far better nudge than asking people to join in.
- **Turnout on the vote** — "41 votes of 180 in the room" prompts the other 139.
- **"Your problem made the top three"** on the phone of everyone whose
  submission landed in a finalist group. The best reason for the person next to
  them to get involved next time.
- **Advisory countdown** on the vote. It creates urgency; it never closes
  anything, because you decide when the room is done.
- **Haptic tick** when a vote registers on a phone.

## Known gaps

- The deck builder edits slide content as JSON. Per-type forms are the obvious
  next layer and need no data change.
- Media is referenced by URL. There is no upload pipeline yet.
- No offline fallback: the app needs Supabase reachable. Rehearse on the same
  network you will present on.
