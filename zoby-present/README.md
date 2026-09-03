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
```

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

Stage keys: `→`/`space` advance, `←` back, `F` fullscreen, `.` blank the screen.

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
