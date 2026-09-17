# Gym

A mobile-first training app that lives at **`/gym`**. It writes you a programme from a
conversation, runs your sets and rest timers, and reshapes the plan when your week does
not go to plan.

Everything is stored in the browser (`localStorage`). There is no account, no server and
no data leaves the device, with one exception: if you add an Anthropic API key, the coach
conversation is sent to the Anthropic API.

## Screens

| Route | What it does |
| --- | --- |
| `/gym` | Today: this week at a glance, the next session, streak and volume, plus catch-up and time-cap shortcuts |
| `/gym/coach` | The coaching conversation that produces or rewrites your programme |
| `/gym/plan` | The full programme, day by day, with the dials for days per week, session length and block length |
| `/gym/workout/:id` | The session player: sets, reps, weights, rest timer, swaps |
| `/gym/history` | Volume, sets per muscle, personal bests, past sessions and body weight |
| `/gym/settings` | Equipment, blocked exercises, timer behaviour, units, theme and API key |
| `/gym/exercises` | The full exercise library, filtered to what your kit allows |

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

## Code layout

```
src/gym/
  types.ts              domain types
  data/                 exercise library and equipment catalogue
  engine/               programme generation, scheduling and adaptation, substitution, progression
  coach/                the built-in coach and the Claude-backed one
  store/gymStore.tsx    all state, persisted to localStorage
  components/           rest timer, swap sheet, catch-up sheet, layout
  pages/                one file per screen
```
