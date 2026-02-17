# Heavy Duty

A Mike Mentzer-inspired workout tracker PWA. Log sets, track progressive overload, and review workout history — all client-side with no backend.

**Live:** [heavygym.netlify.app](https://heavygym.netlify.app)

## Features

- **Weekly program** — 7-day Heavy Duty schedule with push/pull/legs, cardio, and rest days
- **Progressive overload** — automatic suggestions to increase weight, add reps, or deload based on prior session performance
- **Superset support** — visual grouping of pre-exhaust superset pairs with option to split per-session
- **Exercise management** — swap, add, or remove exercises during an active workout or when editing past sessions
- **Exercise reorder** — move exercises up/down during an active workout (superset pairs move together)
- **Bodyweight mode** — exercises like hanging leg raises default to reps-only tracking, with a toggle to add external weight
- **History editing** — full editing of past workouts: swap/add/remove exercises, modify sets/reps/weight, or delete entire sessions
- **Rest timer** — configurable countdown timer with preset durations
- **Offline-ready PWA** — installable, works without internet, data persists in localStorage

## Tech Stack

- React 19, TypeScript (strict), Vite 7
- Tailwind CSS v4 (dark theme, custom design tokens)
- Zustand (persisted to localStorage)
- React Router DOM v7
- PWA via vite-plugin-pwa
- Deployed to Netlify

## Development

```bash
npm install
npm run dev       # http://localhost:5174
npm run build     # tsc + vite build
npm run lint      # eslint
```

## Data Model

All data is client-side. Three Zustand stores persist to localStorage:

| Store | Key | Purpose |
|-------|-----|---------|
| `workoutStore` | `hd_workouts` | Workout history + active workout session |
| `exerciseStore` | `hd_exercises` | Custom exercises, name overrides, bodyweight/weighted preference |
| `settingsStore` | `hd_settings` | Program selection, rest timer duration |

Exercise and program definitions are static in `src/data/`. Currently ships with one program (`heavy-duty-complete`) and 30+ exercises.
