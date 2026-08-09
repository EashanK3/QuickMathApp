# QuickMath

## What this is

A mobile app that teaches mental math the way ranked games teach skill.
Every operation (addition, subtraction, multiplication, division, square
roots, exponents) has its own MMR-style rating that climbs through
competitive tiers (Novice → World Cup level), gated by a difficulty ladder
of "rungs" that terminates at real Mental Calculation World Cup disciplines
(e.g. 8×8-digit multiplication), complete with world-record pace benchmarks
for comparison once a player reaches that rung.

Alongside the ranked ladder is a **Vedic Math curriculum**: shortcut
techniques (multiply by 11, base method, complement subtraction, etc.)
that are rating-gated, not sequence-gated — you unlock a technique because
you're strong enough to benefit from it, not because you finished the
previous lesson. Techniques are surfaced contextually: right after a
relevant wrong answer, or the moment you climb into a rung where a method
starts to matter.

The design bet: pure drilling (Zetamac, etc.) has no narrative arc, and
pure lesson apps (Khan Academy, etc.) have no competitive pull. This app
pairs the two — rank as the hook, technique as the payoff for missing.

## Stack

- Expo SDK 54 (`~54.0.35`), React Native 0.81.5, React 19.1, TypeScript 5.9.
- **Expo has changed significantly.** Read the versioned docs at
  https://docs.expo.dev/versions/v54.0.0/ before writing any Expo-specific
  code (config, APIs, build tooling) — don't rely on pretrained knowledge
  of older SDKs.
- Persistence: `@react-native-async-storage/async-storage` only. No
  backend, no accounts — one local profile per device.
- No test suite, no linter config currently in the repo.

## Running it

```
npm install
npm start          # expo start — QR code for Expo Go
npm run web         # expo start --web (needs react-dom + react-native-web,
                     # already installed; fastest way to sanity-check a change)
npm run android      # expo start --android
npm run ios          # expo start --ios
```

## Architecture

`index.ts` → `App.tsx` → screens. `App.tsx` is a hand-rolled router: a
discriminated union `Screen` type and a switch-like set of conditionals,
no navigation library. Profile state lives in `App.tsx` and is threaded
down as props; screens call back up (`onProfileChange`, `onFinish`, …) to
mutate it. Keep this pattern for new screens rather than introducing a
router or global state library — the app is small enough that prop-drilling
is the intended shape, and the AGENTS/human before you chose it
deliberately (see `App.tsx` inline comments on why saves fire per-question,
not per-session).

```
src/
  types.ts        Profile, Rung, Technique, SessionSummary — read this first
  theme.ts        T — the single source of color/style tokens
  tiers.ts        MMR → tier mapping, promotion/demotion bar math
  ladders.ts       LADDERS — per-operation rung sequences, World Cup benchmarks
  rating.ts        deltaForAnswer / applyDelta — the rating engine + shields
  techniques.ts    TECHNIQUES catalog + unlock/suggestion logic
  questions.ts     question generation + wrong-answer classification
  storage.ts       AsyncStorage load/save, serialized writes, streaks
  screens/         Home, Practice, Results, Learn, Technique
```

## Domain invariants — do not break these silently

These are encoded in comments in the source; repeating them here because
they're easy to "simplify" away without realizing they're load-bearing.

- **Shields, not soft rating floors.** A promotion grants exactly 3
  shields (`rating.ts: applyDelta`). A wrong answer that would drop you
  below the new tier floor is clamped at the floor and burns one shield.
  A correct answer cements the rank and clears the shield immediately —
  shields are not "3 mistakes allowed," they're "3 chances to prove the
  promotion wasn't a fluke." Burning all 3 without a correct answer
  demotes for real, below the floor. Re-entering a tier from above never
  grants a new shield.
- **Rating-gated, not sequence-gated.** `techniques.ts: techniqueStatus`
  unlocks purely on `profile.ratings[op] >= t.ratingUnlock`. Never make
  a technique depend on completing an earlier one — that's the
  differentiator from a normal lesson tree.
- **Per-question persistence.** `PracticeScreen` calls `onProfileChange`
  after every single answer, not at session end. This was a deliberate
  fix (see inline comment) so quitting or backgrounding mid-session
  doesn't discard rating already earned. Any new session-like flow
  should follow the same pattern.
- **Serialized writes.** `storage.ts: saveProfile` chains writes on a
  promise so an out-of-order `setItem` can't roll back a newer profile
  with a stale one. Don't call `AsyncStorage.setItem` directly from a
  screen.
- **`freshProfile()` always returns detached objects.** `DEFAULT_PROFILE`
  is a module-level const; a shallow spread would hand out shared
  `ratings`/`shields` objects that later get mutated in place by the
  rating engine. Any new nested field on `Profile` needs the same
  detach-on-read treatment.
- **World Cup benchmarks only render on the real discipline rung**
  (`ladders.ts: benchmarkFor`, gated on `isWorldCupDiscipline`). Don't
  show record-pace comparisons on easier rungs — it would misrepresent
  the benchmark.
- **`scoredRef` guards double-scoring** in `PracticeScreen` — a timer
  firing at the same moment as a manual submit must not apply the rating
  delta twice. If you touch the submit/timeout flow, keep this guard.

## Visual language

One dark theme, one accent discipline: everything reads off `src/theme.ts`
(`T`). Background/surface/border grays, a single gold (`T.gold`) reserved
for tiers and promotions, blue (`T.accent`) for interactive elements,
green/red for correct/incorrect, purple (`T.purple`) reserved for
everything Vedic (so the "other half" of the app — technique, not rank —
is always visually distinct). Don't introduce new colors without a reason;
extend `T` rather than hardcoding hex values in a screen.

## Conventions

- Comments explain **why**, not what — match the existing style (see any
  file in `src/`). Don't add comments that restate the code.
- Per-screen `StyleSheet.create` at the bottom of the file, not shared
  style files.
- No navigation library, no state management library, no test framework
  has been chosen yet — if one becomes necessary, raise it rather than
  picking silently.
