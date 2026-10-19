# QuickMath

**Try it in your browser: https://eashank3.github.io/QuickMathApp/**

A mental-math training app that teaches arithmetic the way ranked games teach skill.

- **Ranked ladder.** Each operation (addition, subtraction, multiplication, division, square roots, exponents) has its own MMR-style rating that climbs through competitive tiers, from Novice up to Mental Calculation World Cup disciplines such as 8×8-digit multiplication, with world-record pace benchmarks at the top rung.
- **Promotion shields.** A promotion grants three shields; a correct answer cements the new rank, and burning all three demotes you for real.
- **Vedic Math curriculum.** Shortcut techniques (multiply by 11, base method, complement subtraction, and more) unlock by rating rather than lesson order, and appear right after a relevant mistake.
- **Friend mode.** Real-time 1v1 races over Supabase Realtime, with scoring refereed by the server clock and row-level security on every table. Kept fully separate from ranked ratings.
- **AI coach.** Summarizes mistake patterns using a local Ollama model (runs only when an Ollama server is reachable, so it is unavailable on the hosted web demo).

## Stack

Expo SDK 54, React Native 0.81, React 19, TypeScript, Supabase (Postgres + Realtime), AsyncStorage for local profiles. Runs on iOS, Android, and the web.

## Run locally

```
npm install
npm start      # Expo Go on a phone (scan the QR code)
npm run web    # in the browser
```

The web demo is rebuilt and deployed to GitHub Pages on every push to `master` (see `.github/workflows/deploy-web.yml`). Progress is stored in your browser, so each visitor gets a fresh profile.
