# Heavy Duty

A Mike Mentzer-inspired workout tracker PWA. Log sets, track progressive overload, and review workout history — all client-side with no backend.

**Live:** [heavygym.netlify.app](https://heavygym.netlify.app)

## Features

- **Rolling program cycle** — 8-day Heavy Duty cycle (Push → Rest → Pull → Rest → Legs → Cardio → Recovery → Rest) that advances from your last completed workout with no fixed weekday binding. The schedule is history-aware: logged days appear inline alongside planned days, and the cycle automatically skips occupied dates. Quick-logged cardio, recovery, or rest entries advance the cycle past any non-lift day (types are interchangeable), so doing cardio on a scheduled rest day still moves the schedule forward. After 48h+ since your last lift, scheduled rest/cardio/recovery days are automatically skipped (the gap already served as recovery), and the cycle resumes with the least-recently-trained lift day instead of rewinding to one you just did
- **Mentzer warm-up/working set protocol** — each exercise gets 2 sets: a warm-up at 50% weight and a working set to failure, both at 4-1-4 tempo. Set labels ("W-up" / "Work") shown inline
- **Progressive overload** — automatic suggestions to increase weight, add reps, or deload based on working-set (to-failure) performance
- **Equipment switching** — tap the equipment badge on any exercise to swap between barbell, dumbbells, cable, machine, or bodyweight. Overrides persist per exercise
- **Gym equipment curation** — configure your gym's available machines and free weights, then auto-build an optimal workout for each lift focus (Push: 6 exercises, Pull: 6, Legs & Abs: 5). "Try Another Split" shuffles the selection for variety. Shows which slots were skipped when equipment is missing. Locked after first logged set to protect data
- **My Gym page** — dedicated equipment management: toggle built-in items, add/edit/remove custom equipment, select all/deselect all per category, bulk select with multi-delete
- **Open workout** — freeform sessions where you pick any exercises, no predefined program structure
- **Exercise management** — swap, add, remove, or insert exercises at any position during active workouts or when editing past sessions. Create custom exercises from the picker. Auto-replace instantly swaps for a same-muscle-group alternative
- **Skip/alternate exercises** — skip an exercise for the current session so it returns next time, enabling alternation (e.g. leg press ↔ squats). Anti-chronic-skip safeguard (yellow → amber → red block)
- **Auto-save & resume** — workout data persists automatically. Resume banner appears on home page if app closes mid-workout
- **Interactive calendar** — color-coded by session type (green=lift, blue=cardio, recovery, rest). Navigate between months with prev/next arrows (forward capped at current month). Tap any cell (past or future) to quick-log cardio/rest, undo non-lift logs, or move lift workouts via date picker. Future rings project from the rolling cycle, skipping dates that already have sessions. "Schedule →" shortcut links directly to the full schedule view
- **Quick Start** — Home page ("Today") shows a suggested hero card (rolling cycle recommendation) with shortcut grid for non-lift options (Cardio, Recovery, Rest, Open) and a collapsible "Other Workouts" drawer for alternate lift days. Lift options navigate to the workout page, non-lift options instant-log in one tap. After logging, a "Done for Today" card replaces the hero; non-lift shortcuts disable but lift overrides remain accessible
- **Muscle recovery status** — per-muscle-group recovery tracking (Mentzer 4-day rule), resolves custom/swapped exercises. Color-coded pills (orange=recovering, green=ready). Workout page warns when targeting recovering muscles with bulk-skip buttons
- **Smart day suggestions** — upcoming rolling-cycle days adapt to recovery state: ranks alternative lift days by muscle recovery readiness, preferring fully recovered swaps over partial ones, falling back to cardio. Recovery suggestion banner shown on the home hero card
- **Rest day suggestions** — context-aware activity nudges on rest/recovery days or after 2+ days of inactivity
- **Progress charts & PR dashboard** — Charts/Schedule toggle. Muscle-group-categorized exercise picker, per-exercise 1RM trends, volume bars, color-coded PR badges. Schedule tab shows the rolling cycle with date labels, lead-time chips, recovery pills, cycle context explanations (why each day is placed where it is), staleness indicators, smart warnings, and start buttons. Already-logged days appear inline with a "Logged" chip and activity summary
- **One session per day** — only one workout, cardio, or rest entry can exist per date. The store blocks duplicates, and the UI shows inline error messages when a collision is detected. The Workout page prevents starting a new session when today already has a completed entry
- **History** — filter by exercise or day type, inline editing (swap/add/remove exercises, modify sets/reps/weight), delete sessions. Cards show type badges and session stats
- **Full-state backup/restore** — JSON export captures all app state (workout history, active workout, exercise overrides, settings, gym equipment). CSV export (one row per set). Import validates field-by-field, supports v1 legacy format migration
- **Route-level code splitting** — all pages lazy-loaded with route-aware skeleton fallbacks and spring page transitions. Route chunks prefetched on hover/touch/focus for instant navigation
- **4-tab navigation** — Home, Progress, History, and Setup (popover drawer with Exercises + My Gym). Bottom nav prefetches route chunks on interaction
- **Workout session UI** — session summary card (exercise count + set progress), collapsible setup tools, toggleable coaching hints (overload suggestions), collapsible recovery actions
- **Exercise picker filtering** — muscle group filter tabs in the exercise picker modal for faster browsing alongside text search
- **PWA install** — native install prompt (Chrome/Edge) with iOS fallback instructions, app shortcuts (Open Workout, Progress, History), offline-ready via service worker
- **Rest timer** — configurable countdown with presets, auto-starts on set completion (toggleable)
- **Stepper inputs** — ±buttons with exercise-specific increments, long-press rapid adjust, tappable "prev:" hints from last session

## Tech Stack

- React 19, TypeScript (strict), Vite 7
- Tailwind CSS v4 (dark theme, Apple HIG system colors, surface utility classes)
- Zustand (persisted to localStorage)
- React Router DOM v7
- Recharts (progress charts, separate bundle chunk), Motion (page transitions + animations)
- PWA via vite-plugin-pwa (auto-update, maskable icons, app shortcuts)
- Deployed to Netlify

## Design System

Dark theme only, defined in `src/index.css` via Tailwind v4 `@theme` tokens:

- **Fonts**: Bebas Neue (headings), Outfit (body)
- **Colors**: Apple HIG system accent palette (#FF453A red, #FF9F0A orange, #FFD60A yellow, #30D158 green, #0A84FF blue)
- **Backgrounds**: Multi-layer radial gradients with subtle grid texture overlay (no images)
- **Surfaces**: `surface-card`, `surface-card-muted`, `hero-surface`, `sheet-surface`, `floating-nav` (glass blur)
- **Components**: `btn-primary` (gradient), `btn-secondary`, `btn-ghost`, `chip`, `section-label`, `input-shell`, `touch-target` (44px min), `segmented-surface`

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
| `workoutStore` | `hd_workouts` | Workout history, active workout, last completed workout. Mutation actions (`finishWorkout`, `logCardioSession`, `updateWorkoutDate`) return `boolean` — `false` if a workout already exists on the target date. UI callers check return values and show inline error messages |
| `exerciseStore` | `hd_exercises` | Custom exercises, name overrides, bodyweight/weighted preference, equipment overrides. Actions: `restoreState`, `clearAll` |
| `settingsStore` | `hd_settings` | Program selection, rest timer, auto-start timer, gym equipment profile, custom gym equipment. Action: `restoreState` (merges gym equipment over defaults) |

Date handling uses a **date-key abstraction** (`YYYY-MM-DD` strings) in `lib/dates.ts` for timezone-safe day-boundary arithmetic. All day comparisons use UTC-based math; session timestamps pin to noon local time via `createSessionIso()`. Relative date formatting handles future dates ("Tomorrow", "In 3 days"). Recovery and staleness functions exclude future-dated entries to avoid counting pre-logged sessions as "done".

Exercise and program definitions are static in `src/data/`. Currently ships with one program (`heavy-duty-complete`) with an 8-day rolling cycle (3 lift days separated by rest days, plus cardio, recovery, and rest), and ~49 exercises. Cardio activities are consolidated under a single `hd-cardio` key covering both steady-state and interval options. Shared utilities in `src/lib/`: history-aware rolling cycle projection with non-lift type matching, rest-day skipping after 48h+ gaps, and stalest-lift-first resumption (`rollingSchedule.ts`), gym equipment curation (`curatedWorkout.ts`), muscle recovery tracking and smart day suggestions (`recovery.ts`), date-key primitives and formatting (`dates.ts`), full-state backup/restore with v1 migration (`export.ts`), per-set PR detection (`records.ts`), route-level lazy loading and prefetch (`routePrefetch.ts`).
