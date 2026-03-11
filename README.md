# Heavy Duty

A Mike Mentzer-inspired workout tracker PWA. Log sets, track progressive overload, and review workout history — all client-side with no backend.

**Live:** [heavygym.netlify.app](https://heavygym.netlify.app)

## Features

- **Weekly program** — 7-day Heavy Duty schedule with push/pull/legs, cardio, and rest days
- **Mentzer warm-up/working set protocol** — each exercise gets 2 sets: a warm-up at 50% weight and a working set to failure, both at 4-1-4 tempo. Set labels ("W-up" / "Work") shown inline
- **Progressive overload** — automatic suggestions to increase weight, add reps, or deload based on working-set (to-failure) performance
- **Equipment switching** — tap the equipment badge on any exercise to swap between barbell, dumbbells, cable, machine, or bodyweight. Overrides persist per exercise
- **Gym equipment curation** — configure your gym's available machines and free weights, then auto-build an optimal workout for each lift focus (Push/Pull/Legs & Abs). Locked after first logged set to protect data
- **Superset support** — visual grouping of pre-exhaust superset pairs with option to split per-session
- **Open workout** — freeform sessions where you pick any exercises, no predefined program structure
- **Exercise management** — swap, add, remove, or insert exercises at any position during an active workout or when editing past sessions. Create custom exercises directly from the exercise picker
- **Skip/alternate exercises** — skip an exercise for the current session so it returns next time, enabling alternation (e.g. leg press ↔ squats)
- **Auto-save & resume** — workout data persists automatically on every change. If the app closes mid-workout, a resume banner appears on the home page
- **Exercise reorder** — move exercises up/down during an active workout (superset pairs move together)
- **Bodyweight mode** — exercises like hanging leg raises default to reps-only tracking, with a toggle to add external weight
- **Bento stats dashboard** — streak, total workouts, last session focus, and M–S training-day dots on the home page
- **Per-exercise tracking** — home page shows last-done date for every exercise in each day card
- **History filtering** — filter past workouts by exercise; tap any exercise tag to narrow results
- **History editing** — full editing of past workouts with the same card UI as active workouts: swap/add/remove exercises, modify sets/reps/weight, or delete entire sessions
- **Rest timer** — configurable countdown timer with preset durations, auto-starts on set completion (respects superset logic, toggleable)
- **Stepper inputs** — ±buttons on weight/rep fields with exercise-specific increments and long-press rapid adjust. Tappable "prev:" hints auto-fill from last session
- **Progress charts** — muscle-group-categorized exercise picker (Chest, Back, Shoulders, Arms, Traps, Legs, Abs tabs), per-exercise estimated 1RM trend lines, volume bar charts, and color-coded PR dashboard (best weight, est. 1RM, best volume) powered by Recharts
- **Data export & backup** — full JSON backup (workouts + exercises + settings), CSV export (one row per set), and import with deduplication
- **Offline-ready PWA** — installable, works without internet, data persists in localStorage

## Tech Stack

- React 19, TypeScript (strict), Vite 7
- Tailwind CSS v4 (dark theme, custom design tokens)
- Zustand (persisted to localStorage)
- React Router DOM v7
- Recharts (progress charts)
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
| `exerciseStore` | `hd_exercises` | Custom exercises, name overrides, bodyweight/weighted preference, equipment overrides |
| `settingsStore` | `hd_settings` | Program selection, rest timer duration, auto-start timer toggle, gym equipment profile |

Exercise and program definitions are static in `src/data/`. Currently ships with one program (`heavy-duty-complete`) and ~40 exercises. Gym equipment curation logic lives in `src/lib/curatedWorkout.ts`.
