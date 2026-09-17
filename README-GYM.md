# Gym

A mobile-first training app that lives at **`/gym`**. It writes you a programme from a
conversation, runs your sets and rest timers, and reshapes the plan when your week does
not go to plan.

Sign in and your training follows you to any device. Without an account everything stays in
the browser (`localStorage`) and nothing leaves the device, with one exception: if you add an
Anthropic API key, the coach conversation is sent to the Anthropic API.

## Screens

| Route | What it does |
| --- | --- |
| `/gym` | Today: this week at a glance, the next session, streak and volume, plus catch-up and time-cap shortcuts |
| `/gym/coach` | The coaching conversation that produces or rewrites your programme |
| `/gym/plan` | The full programme, day by day, with the dials for days per week, session length and block length |
| `/gym/workout/:id` | The session player: sets, reps, weights, rest timer, swaps |
| `/gym/history` | Volume, sets per muscle, personal bests, past sessions and body weight |
| `/gym/auth` | Sign in, create an account, or choose to stay on this device |
| `/gym/profile` | Name, height, weight, age and experience |
| `/gym/settings` | Account, equipment, blocked exercises, timer behaviour, units, theme and API key |
| `/gym/exercises` | The full exercise library, filtered to what your kit allows |

## Accounts and sync

Auth is Supabase, which this repository already uses. Signing in gives each person their own
private copy of everything; nothing is shared between accounts.

**What you need to do once:** run `supabase/migrations/20260917090000_gym_state.sql` against
your Supabase project (paste it into the SQL editor, or `supabase db push`). It creates one
table, `gym_state`, with row level security so a signed-in user can only ever read and write
their own row. Until that migration runs, signing in works but syncing reports that the table
is missing, and the app keeps working locally.

Also check **Authentication > Providers > Email** in the Supabase dashboard. With email
confirmation on, new accounts get a confirmation link first; with it off, sign-up logs you
straight in. Both are handled.

The client keeps the model it already had: one state document per person, pushed as a single
row and debounced so a burst of taps is one write. That means:

- Sign up on a device that already has training on it and that training moves into the
  account, rather than being thrown away.
- Sign in on a fresh device and the account's training comes down.
- If both sides have real training, the app stops and asks which to keep rather than guessing.
  The losing copy is replaced, so the dialog says so plainly.
- Signing out pushes anything outstanding, then clears the device, so handing your phone to a
  friend does not hand over your training history.

The tradeoff of a single document is that two devices editing at once is last-writer-wins at
the document level. For a training app used by one person at a time that is fine. Social
features (seeing a friend's sessions, shared leaderboards) would want the sessions split into
their own table with their own policies, which is a bigger change than this one.

Accounts are optional. "Use it on this device only" skips auth entirely, and Settings has a
button to create an account later without losing anything.

## Your details

`/gym/profile` holds name, sex, age, height, weight and experience. Two things use it.

**Starting weights.** `src/gym/engine/strength.ts` holds a table of one rep maxes as multiples
of bodyweight for an intermediate male lifter, scaled by experience, sex and age, converted
from a one rep max to the session's rep range, shaved by twelve percent because the first
session should be finishable, and rounded to something you can load. So instead of "first time
on this one, pick a weight", the first set of every new lift arrives pre-filled with a real
number. As soon as there is one logged set, the logged numbers take over and the estimate is
never used again.

Sex is optional and only moves the estimate; leaving it out uses a figure between the two.
Nothing in the app is gated on it.

**The coach.** Height, weight, age, experience and your free-text notes are included in the
coach's context, so it stops asking what it already knows and can talk about your training in
terms of your actual body. With Claude connected this makes a noticeable difference to the
quality of the conversation.

Switching between kg and lb converts every stored number rather than relabelling it, so old
sessions stay true.

## The coach

Two coaches, same interface.

- **Built-in coach** (default). Runs entirely offline. It reads your answers for the goal,
  days per week, session length, experience, equipment and anything it should work around,
  and asks for whatever is still missing.
- **Claude coach**. Add an Anthropic API key in Settings and the conversation runs on
  `claude-opus-5` instead, so you can explain your situation however you like. The key is
  kept in this browser only and is sent nowhere but the Anthropic API. If a request fails,
  the built-in coach picks the conversation up rather than leaving you stuck.

Either way the conversation ends with a proposal card. Nothing changes until you tap
**Build my programme**, and completed sessions are always kept when a programme is replaced.

## Programme generation

`src/gym/engine/programGenerator.ts` turns a `ProgramSpec` into a week of training.

1. **Split** by days per week: 1-2 days full body, 3 days full body or a hybrid with
   conditioning, 4 days upper/lower, 5 days PPL plus upper/lower, 6 days PPL twice.
2. **Slots** per day describe a movement pattern and a role (main lift, secondary,
   accessory, core, conditioning) rather than naming exercises.
3. **Exercises** are chosen per slot from what your kit allows, avoiding anything
   contraindicated for the joints you flagged, with a penalty for repeating a movement
   elsewhere in the week so the programme stays varied.
4. **Sets, reps and rest** come from the goal and your experience.
5. **Time fitting** squeezes the day into your session length the way a coach would:
   superset the accessories, tighten the rests that can be tightened, drop the least
   important work, then shave sets. Main lifts go last.

## Equipment you have not got

Settings has four presets (full gym, free weights, home, bodyweight) and a switch for every
individual piece of kit. Turning something off has an immediate effect: every exercise in
your programme that needs it is replaced with the closest thing you can do, scored on
movement pattern, muscles worked, exercise type and how heavily it loads. An adjustable
bench counts as a flat bench.

The same thing is available mid-session. Tap **Swap** on any exercise and you get ranked
alternatives, a search over the whole library, and a row of "No dumbbells" style buttons for
whatever the exercise needs. Tapping one removes that kit from your whole plan, not just
today's session. **Never programme this** blocks a single exercise for good.

Where nothing suitable exists (there is no bodyweight substitute for a lat pulldown), the
plan says so plainly and offers to rebuild around your kit rather than quietly dropping it.

## Missing sessions and short weeks

- **Behind on the plan.** Today shows how many sessions you have missed. Pick which ones to
  fold together, set how long you actually have, and you get a single session that keeps the
  main lifts, merges duplicated movements and cuts the accessories first.
- **Only N days this week.** On the Plan screen, fold the rest of this week into one, two or
  three sessions without touching the following weeks.
- **Short on time today.** The 20, 30 and 45 minute buttons on Today re-cut the session in
  place.
- **Not today.** Shift the whole plan forward a day, or skip the session.
- **Permanently fewer days.** Change days per week on the Plan screen and the programme is
  rebuilt around the new frequency. Your logged history is never touched.

## Running a session

Tick sets off as you do them. The rest timer starts automatically, is driven by wall-clock
timestamps so it stays accurate when the screen sleeps, and beeps and vibrates on the
warning and at the end. You can add or take away 15 seconds, pause it or skip it. The screen
is kept awake while a session is open, where the browser allows it.

Each exercise shows what to aim for, based on what you did last time. Fill the rep range at
a given weight and the next session tells you to add the smallest sensible jump. Miss the
bottom of the range three sessions running and it tells you to back off ten percent.

## Making the gym the home page

The UTM link builder still owns `/`. To swap them, change the two routes in `src/App.tsx`:

```tsx
<Route path="/*" element={<GymApp />} />
<Route path="/utm" element={<Index />} />
```

## Look

Dark by default: near-black blue-tinted background, neon orange as the primary, electric blue
as the accent, with a green that only ever means "set done". The palette lives in
`src/index.css` under `:root.gym-neon`, and the class is only on `<html>` while the gym routes
are mounted, so the link builder at `/` keeps its own blue theme. There is a tuned light
variant under `.gym-neon.gym-light` for anyone who wants it; Settings has the switch.

## Code layout

```
src/gym/
  types.ts              domain types
  data/                 exercise library and equipment catalogue
  engine/               programme generation, scheduling and adaptation, substitution, progression, starting weights
  coach/                the built-in coach and the Claude-backed one
  store/gymStore.tsx    all state, persisted to localStorage and synced to Supabase
  store/auth.tsx        Supabase session handling
  store/remote.ts       the one table this app reads and writes
  components/           rest timer, swap sheet, catch-up sheet, layout
  pages/                one file per screen
```
