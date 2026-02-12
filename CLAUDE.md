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
│   └── settingsStore.ts # Zustand: program selection + rest timer (key: hd_settings)
├── data/
│   ├── exercises.ts     # Static exercise catalog (30+ exercises) + lookup helpers
│   ├── programs.ts      # Program definitions (days, supersets, cardio/rest days)
│   └── quotes.ts        # Mike Mentzer quotes
├── lib/
│   └── overload.ts      # Progressive overload algorithm (pure function)
├── hooks/
│   ├── useTimer.ts      # Countdown timer (rest between sets)
│   └── useOverload.ts   # Connects overload logic to workout history
├── pages/
│   ├── Home.tsx         # Weekly schedule, sorted by today's day-of-week
│   ├── Workout.tsx      # Active workout logging (sets/reps/weight/failure)
│   ├── History.tsx       # Past workout table view
│   ├── ExerciseLibrary.tsx  # Browse exercises by muscle group
│   └── ExerciseDetail.tsx   # Exercise info, muscle map, overload suggestion, history
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
- **Progressive overload** — `lib/overload.ts` is a pure function: given an exercise definition and last session's sets, returns a suggestion (increase/maintain/decrease weight). Used by `useOverload` hook and directly in `Workout.tsx`.
- **Superset system** — exercises have `supersetWith` field linking pairs. Programs define `supersets: [string, string][]` arrays. Workout page shows superset blocks and adjusts rest timer behavior (no rest between superset exercises, rest after the pair).
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
| `/history` | History | Past workouts |
| `/library` | ExerciseLibrary | Browse by group |
| `/exercise/:id` | ExerciseDetail | Exercise info + history |
