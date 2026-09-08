# Setting up a Supabase project

Everything below is done once. Roughly fifteen minutes.

You need the Supabase CLI (`brew install supabase/tap/supabase`) and your
project reference from the dashboard URL:
`supabase.com/dashboard/project/<REF>` — the `<REF>` part.

## 1. Local environment

Create `.env` in the project root:

```
VITE_SUPABASE_URL=https://<REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<your publishable key, sb_publishable_...>
VITE_PUBLIC_APP_URL=
```

Leave `VITE_PUBLIC_APP_URL` empty locally; set it to your live domain in the
deployment environment so the QR codes point at the right place.

**Only the publishable key goes here.** It is designed to sit in the browser —
row-level security is what protects the data. The secret key (`sb_secret_...`)
must never appear in `.env`, in the repo, in a chat, or in the hosting panel.
Edge Functions receive it from Supabase automatically at runtime.

## 2. Create the schema

```bash
supabase link --project-ref <REF>
supabase db push
```

That applies the four migrations in order: core schema, upvotes, contacts and
privacy, moderation.

## 3. Deploy the functions

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy cluster-problems
supabase functions deploy screen-submissions
```

Both are required. Without `screen-submissions` nothing clears moderation and
the wall stays empty.

Set the API key with the command above, not by pasting it into a file.

## 4. Demo content

```bash
supabase db execute --file supabase/seed.sql
```

Creates the ZOBY org, an event with join code `ZOBY26`, three sessions, and a
worked deck. Safe to re-run — it clears the demo org first.

## 5. Give yourself access

Row-level security means a signed-in user sees nothing until they are a member
of an organisation.

1. `npm run dev`, open the app, sign in with your email (magic link).
2. Find your user id: dashboard → **Authentication → Users** → copy the UUID.
3. Dashboard → **SQL Editor**, run:

```sql
insert into public.org_members (org_id, user_id, role)
select id, '<your-user-id>', 'owner' from public.orgs where slug = 'zoby';
```

Reload. The event appears.

## 6. Check it works

```bash
npm run dev
```

1. Open the event, press **Open the doors**, then **Go live** on session one.
2. Open `/present/<sessionId>` in one window, `/control/<sessionId>` in another.
3. From the remote, go to the collect slide and press **Open submissions**.
4. On your phone (or a private window), open `/join/ZOBY26` and submit
   something. It should appear on the stage within a second or two.

If it does not appear, it is almost certainly moderation: check the remote's
**Screening** panel. Pending means `screen-submissions` is not deployed or the
`ANTHROPIC_API_KEY` secret is missing.

## Before the event

- Set `VITE_PUBLIC_APP_URL` to the live domain, or the QR codes point at
  localhost.
- Replace the seeded pre-event problems in `seed.sql` with real survey answers,
  or delete them.
- Replace the demo study figures in session two with your own.
- Set each session's slot length in the deck builder so the stage clock works.
- Run the whole thing once on the venue network.
- Load `/join/<CODE>` directly in a fresh tab on mobile data, not just wifi.
