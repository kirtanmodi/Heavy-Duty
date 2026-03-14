# Heavy Duty

A Mike Mentzer-inspired workout tracker PWA. Log sets, track progressive overload, and review workout history — all client-side with no backend.

**Live:** [heavygym.netlify.app](https://heavygym.netlify.app)

## Features

- **Weekly program** — 7-day Heavy Duty schedule with push/pull/legs, cardio, and rest days
- **Mentzer warm-up/working set protocol** — each exercise gets 2 sets: a warm-up at 50% weight and a working set to failure, both at 4-1-4 tempo. Set labels ("W-up" / "Work") shown inline
- **Progressive overload** — automatic suggestions to increase weight, add reps, or deload based on working-set (to-failure) performance
- **Equipment switching** — tap the equipment badge on any exercise to swap between barbell, dumbbells, cable, machine, or bodyweight. Overrides persist per exercise
- **Gym equipment curation** — configure your gym's available machines and free weights, then auto-build an optimal workout for each lift focus (Push: 6 exercises, Pull: 6, Legs & Abs: 5). Matches Mentzer's original Heavy Duty prescription. "Try Another Split" shuffles the selection for variety, preferring exercises not already in the workout. Shows which slots were skipped when equipment is missing. Locked after first logged set to protect data
- **My Gym page** — dedicated equipment management page to toggle machines, free weights, and cardio equipment. Add, edit, and remove custom equipment. Select all/deselect all per category. Bulk select mode with multi-delete
- **Open workout** — freeform sessions where you pick any exercises, no predefined program structure
- **Exercise management** — swap, add, remove, or insert exercises at any position during an active workout or when editing past sessions. Create custom exercises directly from the exercise picker
- **Auto replace** — instantly swap an exercise for a random alternative targeting the same muscle group via the 3-dot menu, no manual browsing needed
- **Skip/alternate exercises** — skip an exercise for the current session so it returns next time, enabling alternation (e.g. leg press ↔ squats)
- **Auto-save & resume** — workout data persists automatically on every change. If the app closes mid-workout, a resume banner appears on the home page
- **Exercise reorder** — move exercises up/down during an active workout
- **Bodyweight mode** — exercises like hanging leg raises default to reps-only tracking, with a toggle to add external weight
- **Cardio & rest day tracking** — log cardio and recovery sessions with a "Mark as Done" button. Color-coded calendar: green for lifts, blue for cardio, subtle dots for rest days
- **Muscle recovery status** — per-muscle-group recovery tracking based on Mentzer's 4-day recovery rule. Home page shows color-coded pills (orange = recovering, green = ready)
- **Rest day suggestions** — context-aware activity nudges on rest/recovery days or after 2+ days of inactivity
- **Recovery warnings** — workout page warns when targeted muscle groups are still recovering
- **Bento stats dashboard** — streak, total workouts, last session focus, muscle recovery status, rest day suggestions, and M–S color-coded training calendar on the home page
- **Per-exercise tracking** — home page shows last-done date for every exercise in each day card
- **History filtering** — filter past workouts by exercise; tap any exercise tag to narrow results
- **History editing** — full editing of past workouts with the same card UI as active workouts: swap/add/remove exercises, modify sets/reps/weight, or delete entire sessions. Cardio/recovery entries display type badges
- **Rest timer** — configurable countdown timer with preset durations, auto-starts on set completion (toggleable)
- **Stepper inputs** — ±buttons on weight/rep fields with exercise-specific increments and long-press rapid adjust. Tappable "prev:" hints auto-fill from last session
- **Progress charts** — muscle-group-categorized exercise picker (Chest, Back, Shoulders, Arms, Traps, Legs, Abs tabs), per-exercise estimated 1RM trend lines, volume bar charts, and color-coded PR dashboard (best weight, est. 1RM, best volume) powered by Recharts
- **Data export & backup** — full JSON backup (workouts + exercises + settings), CSV export (one row per set, includes day type column), and import with deduplication
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
| `settingsStore` | `hd_settings` | Program selection, rest timer duration, auto-start timer toggle, gym equipment profile, custom gym equipment |

Exercise and program definitions are static in `src/data/`. Currently ships with one program (`heavy-duty-complete`) with lift, cardio, recovery, and rest days, and ~49 exercises covering chest, back, shoulders, arms, traps, legs, lower back, hips, and core. Shared utilities in `src/lib/`: gym equipment curation (`curatedWorkout.ts`), muscle recovery tracking (`recovery.ts`), date formatting (`dates.ts`), per-set PR detection (`records.ts`).
