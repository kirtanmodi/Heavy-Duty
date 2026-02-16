# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 5174
npm run build        # TypeScript check + Vite build (tsc -b && vite build)
npm run lint         # ESLint (flat config, TS/TSX only)
npm run preview      # Preview production build
netlify deploy --prod  # Deploy to Netlify
```

No test framework is configured.

## Tech Stack

- React 19 + TypeScript (strict mode, `noUnusedLocals`/`noUnusedParameters` enabled)
- Vite 7 with Tailwind CSS v4 (`@tailwindcss/vite` plugin, `@theme` block in `index.css`)
- Zustand for state (persisted to localStorage)
- React Router DOM v7 (BrowserRouter)
- PWA via `vite-plugin-pwa` (service worker auto-update, manifest in `vite.config.ts`)
- Deployed to Netlify (SPA catch-all redirect in `netlify.toml`)

## Architecture

```
src/
├── App.tsx              # BrowserRouter + route definitions
├── main.tsx             # React root mount
├── index.css            # Tailwind v4 @theme (design tokens + base styles)
├── types/index.ts       # All shared TypeScript types
├── store/
│   ├── workoutStore.ts  # Zustand: workout history + active workout (key: hd_workouts)
│   ├── exerciseStore.ts # Zustand: custom exercises, name overrides, weight mode (key: hd_exercises)
│   └── settingsStore.ts # Zustand: program selection + rest timer (key: hd_settings)
├── data/
│   ├── exercises.ts     # Static exercise catalog (30+ exercises) + lookup helpers
│   ├── programs.ts      # Program definitions (days, supersets, cardio/rest days)
│   └── quotes.ts        # Mike Mentzer quotes
├── lib/
│   └── overload.ts      # Progressive overload algorithm (pure function, bodyweight-aware)
├── hooks/
│   ├── useTimer.ts      # Countdown timer (rest between sets)
│   └── useOverload.ts   # Connects overload logic to workout history
├── pages/
│   ├── Home.tsx         # Weekly schedule, sorted by today's day-of-week
│   ├── Workout.tsx      # Active workout logging (sets/reps/weight/failure)
│   ├── History.tsx      # Past workouts with inline edit mode
│   └── Exercises.tsx    # Exercise management (rename, add, remove)
└── components/
    ├── layout/
    │   ├── PageLayout.tsx   # Safe-area-aware page wrapper
    │   └── BottomNav.tsx    # Tab bar (hidden during active workout)
    └── anatomy/
        └── MuscleMap.tsx    # SVG front/back body diagram with muscle highlighting
```

### Key Patterns

- **No backend/API** — all data is client-side. Workout history persists in localStorage via Zustand `persist` middleware.
- **Static exercise/program data** — defined in `src/data/`, looked up via `Map` helpers (`exerciseMap`, `programMap`). Currently only one program: `heavy-duty-complete`.
- **Progressive overload** — `lib/overload.ts` is a pure function: given an exercise definition and last session's sets, returns a suggestion (increase/maintain/decrease weight). Bodyweight exercises (`equipment: 'bodyweight+'`) get rep-focused messages instead of weight-focused.
- **Superset system** — programs define `supersets: [string, string][]` arrays. Workout page groups superset pairs visually (yellow left border). Users can split supersets per-session via `activeWorkout.splitSupersets`. Rest timer: no rest between superset exercises, 2min rest after the pair.
- **Bodyweight exercise mode** — exercises with `equipment: 'bodyweight+'` default to reps-only (no Kg column). Users toggle "+ Add Weight" / "BW Only" per exercise. Preference persists in `exerciseStore.weightMode`.
- **Exercise swap** — during an active workout, any exercise can be swapped for an alternative filtered by matching primary muscle group. Uses a full-screen modal (`SwapModal` in `Workout.tsx`).
- **Exercise reorder** — up/down arrows per exercise group during active workout. Superset pairs move as a unit.
- **History editing** — past workouts can be edited inline (modify sets/reps/weight, remove exercises, delete entire workout) via `updateHistoryEntry` / `deleteHistoryEntry` store actions.
- **Mobile-first PWA** — max-width 460px, safe-area insets, portrait orientation, standalone display. Bottom nav hides on workout route.

### Design System

Defined in `src/index.css` `@theme` block (Tailwind v4 syntax):
- **Fonts**: Oswald (display/headings via `--font-display`), DM Sans (body via `--font-body`)
- **Colors**: Dark theme only. Semantic tokens: `bg-primary`, `bg-card`, `bg-input`, `text-primary/secondary/muted/dim`, `border`, `border-card`. Accent colors: `accent-red` (primary CTA), `accent-orange/yellow/green/blue`. Per-muscle-group colors for the anatomy SVG.
- Use Tailwind utility classes with these custom tokens (e.g., `bg-bg-card`, `text-text-muted`, `border-accent-red/30`).

### Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/` | Home | Weekly schedule |
| `/workout/:dayId` | Workout | Active session (bottom nav hidden) |
| `/exercises` | Exercises | Exercise management |
| `/history` | History | Past workouts with edit mode |
