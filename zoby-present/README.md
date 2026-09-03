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

## Known gaps

- The deck builder edits slide content as JSON. Per-type forms are the obvious
  next layer and need no data change.
- Media is referenced by URL. There is no upload pipeline yet.
- No offline fallback: the app needs Supabase reachable. Rehearse on the same
  network you will present on.
