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
│   └── settingsStore.ts # Zustand: program selection, rest timer, auto-start timer (key: hd_settings)
├── data/
│   ├── exercises.ts     # Static exercise catalog (30+ exercises) + lookup helpers
│   ├── programs.ts      # Program definitions (days, supersets, cardio/rest days)
│   └── quotes.ts        # Mike Mentzer quotes
├── lib/
│   ├── overload.ts      # Progressive overload algorithm (pure function, bodyweight-aware)
│   ├── stats.ts         # Workout stats (volume, sets, progress comparison)
│   ├── charts.ts        # Exercise session aggregation, 1RM estimation (Epley), PR extraction
│   └── export.ts        # JSON/CSV export, import validation + merge logic
├── hooks/
│   ├── useTimer.ts      # Countdown timer (rest between sets)
│   └── useOverload.ts   # Connects overload logic to workout history
├── pages/
│   ├── Home.tsx            # Monthly calendar, bento stats grid, resume banner, muscle volume, backup/export
│   ├── Workout.tsx         # Active workout logging (program days + open/freeform)
│   ├── WorkoutSummary.tsx  # Post-finish summary (stats, exercise list, history link)
│   ├── Progress.tsx        # Per-exercise charts (1RM trend, volume bars), PR dashboard
│   ├── History.tsx         # Past workouts with inline edit, delete + exercise filter
│   └── Exercises.tsx       # Exercise management (rename, add, remove)
└── components/
    ├── ExerciseCard.tsx         # Shared exercise card (used by Workout + History edit)
    ├── ExercisePickerModal.tsx  # Shared full-screen exercise picker (swap/add modes)
    ├── StepperInput.tsx         # Reusable ±stepper with long-press support (weight/rep inputs)
    ├── MuscleVolumeCard.tsx     # Weekly sets-per-muscle-group bar chart for Home page
    └── layout/
        ├── PageLayout.tsx   # Safe-area-aware page wrapper
        └── BottomNav.tsx    # 4-tab bar: Home, Progress, Exercises, History (hidden during active workout)
```

### Key Patterns

- **No backend/API** — all data is client-side. Workout history persists in localStorage via Zustand `persist` middleware.
- **Static exercise/program data** — defined in `src/data/`, looked up via `Map` helpers (`exerciseMap`, `programMap`). Currently only one program: `heavy-duty-complete`.
- **Progressive overload** — `lib/overload.ts` is a pure function: given an exercise definition and last session's sets, returns a suggestion (increase/maintain/decrease weight). Bodyweight exercises (`equipment: 'bodyweight+'`) get rep-focused messages instead of weight-focused.
- **Superset system** — programs define `supersets: [string, string][]` arrays. Workout page groups superset pairs visually (yellow left border). Users can split supersets per-session via `activeWorkout.splitSupersets`. Rest timer: no rest between superset exercises, 2min rest after the pair.
- **Bodyweight exercise mode** — exercises with `equipment: 'bodyweight+'` default to reps-only (no Kg column). Users toggle "+ Add Weight" / "BW Only" per exercise. Preference persists in `exerciseStore.weightMode`.
- **Shared exercise card** — `ExerciseCard` component (`src/components/ExerciseCard.tsx`) renders the full exercise UI (name, equipment, rep range, bodyweight toggle, set inputs, swap/remove icons, inline remove confirmation). Used identically by both Workout and History edit pages. Manages bodyweight mode and remove-confirm state internally. Accepts optional `showOverloadBanner`, `overloadSuggestion`, `restButtons`, `onSkip`, `onUnskip`, and `onSetComplete` props (Workout-only features). When `entry.skipped === true`, renders a collapsed card with exercise name, "Skipped" badge, and 3-dot menu (Unskip/Swap/Remove). Set inputs use `StepperInput` component with ±buttons (weight step from `exercise.weightIncrement`, rep step = 1) and tappable "prev:" hints that auto-fill from last session.
- **Exercise picker modal** — shared `ExercisePickerModal` component (`src/components/ExercisePickerModal.tsx`) used by both Workout and History pages. Supports `mode: 'swap'` (replace exercise) and `mode: 'add'` (append exercise). Filters out exercises already in the workout. Groups candidates by muscle group. In swap mode, tapping an exercise shows an action sheet with "Swap" and "Add to Workout" options via the `onSelectWithAction` prop.
- **Exercise CRUD (active workout)** — swap exercise (picker modal), add exercise (dashed button, appends at end with overload suggestion), insert exercise at position (`+` divider buttons between groups), remove exercise (trash icon with inline confirmation), reorder (up/down arrows, superset pairs move as a unit). Store actions: `addExerciseToWorkout`, `insertExerciseAtIndex`, `removeExerciseFromWorkout`.
- **Exercise CRUD (history edit)** — identical card UI to active workout. Swap exercise (preserves existing sets, changes exercise identity only), add exercise (appends with empty sets), remove exercise, modify sets/reps/weight. All changes saved atomically via `updateHistoryEntry`. Overload banner and rest timer are omitted.
- **Open workout** — `/workout/open` starts a freeform session with no predefined exercises or supersets. Exercise picker opens automatically on entry. Day card on Home uses dashed yellow border. `dayId: "open"` is stored in history and colored `accent-yellow`.
- **Per-exercise last-done dates** — Home page day cards list each exercise with its last-done date (sourced from `getExerciseLastDoneDate` in `workoutStore`). Exercise list comes from last session history or falls back to the program definition.
- **Bento stats grid** — Home page displays stat cards: Streak (consecutive days), Total Workouts (1-col each), Last Session (col-span-2, day focus + relative date), and This Month (col-span-2, mini calendar grid with M–S headers, green circles for trained days, ring for today, session count).
- **History delete workout** — expanded history cards show a trash icon next to "Edit Workout". Tapping it shows an inline red confirmation (matching the "Clear All Data" pattern). Uses `deleteHistoryEntry(workoutId)` store action.
- **History exercise filter** — clicking an exercise tag in collapsed history cards filters the list to workouts containing that exercise. Active filter shows as a dismissible chip above results.
- **History card titles** — card headers strip the "Day N — " prefix from `workout.day`, showing just the focus (e.g., "Chest, Shoulders, Triceps"). Dates always show "Day · Date" format (e.g., "Mon · Feb 23").
- **Skip exercise (alternate exercises)** — exercises can be skipped for the current session via 3-dot menu ("Skip This Week"). Skipped exercises render as collapsed single-line cards with a "Skipped" badge. `ExerciseEntry.skipped?: boolean` flag is backwards-compatible. Skipped exercises are preserved in history so they seed back next session (unskipped). `getLastSets`, `getExerciseLastDoneDate`, `getExerciseHistory` all skip over entries where `skipped === true`. `calcStats` excludes skipped exercises from totals. History and WorkoutSummary pages show skipped exercises with distinct styling.
- **Save/resume workout** — `activeWorkout` is automatically persisted to localStorage via Zustand `persist` middleware on every state change. No explicit save needed. Home page shows a green "In Progress" resume banner when `activeWorkout !== null`. Navigating to a different day while a workout is active shows a conflict dialog (Resume / Discard & Start New). The X button mid-workout shows a 3-option dialog: "Keep Going", "Go to Home" (navigates home without cancelling — workout stays active for resume), and "Cancel Workout" (discards). A `leavingRef` in Workout.tsx prevents the `useEffect` from re-creating a workout during the AnimatePresence exit animation after finishing, cancelling, or navigating home.
- **Exercise reorder** — up/down arrows per exercise group during active workout. Superset pairs move as a unit. Not available in history edit (order has no functional impact on logged data).
- **Auto-start rest timer** — when a set is completed (checkmark toggle), the rest timer auto-starts using the exercise's `restSeconds`. Respects superset logic: no auto-rest after the first exercise in a pair, auto-rest after the second. Controlled by `settingsStore.autoStartTimer` (default: true). Toggle visible in the rest timer modal.
- **Stepper inputs** — `StepperInput` component (`src/components/StepperInput.tsx`) wraps number inputs with `[-]` / `[+]` buttons. Long-press for rapid increment via `useRef`-based interval. Weight step respects `exercise.weightIncrement`; rep step is always 1. Tappable "prev:" hints auto-fill from last session.
- **Data export & backup** — collapsible "Backup & Export" section on Home page. `lib/export.ts` handles JSON export (full backup: workouts + exercises + settings), CSV export (flat: one row per set), and import with validation + deduplication by workout ID. Import uses `workoutStore.importHistory()`.
- **Weekly muscle volume tracker** — `MuscleVolumeCard` component on Home page. Aggregates completed sets per consolidated muscle group (Chest, Back, Shoulders, etc.) for the current Mon–Sun week. Horizontal bars with target line at 15 sets. Auto-hides when no data.
- **Progress charts & PR dashboard** — `/progress` route with `recharts` library. Exercise picker (horizontal scroll, color-coded). Per-exercise: estimated 1RM trend (Epley formula), volume bar chart, PR badges (best weight, est. 1RM, best volume). `lib/charts.ts` provides pure aggregation functions.
- **Mobile-first PWA** — max-width 460px, safe-area insets, portrait orientation, standalone display. Bottom nav hides on workout route.

### Design System

Defined in `src/index.css` `@theme` block (Tailwind v4 syntax):
- **Fonts**: Oswald (display/headings via `--font-display`), DM Sans (body via `--font-body`)
- **Colors**: Dark theme only. Semantic tokens: `bg-primary`, `bg-card`, `bg-input`, `text-primary/secondary/muted/dim`, `border`, `border-card`. Accent colors: `accent-red` (primary CTA), `accent-orange/yellow/green/blue`.
- Use Tailwind utility classes with these custom tokens (e.g., `bg-bg-card`, `text-text-muted`, `border-accent-red/30`).

### Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/` | Home | Monthly calendar, stats, muscle volume, backup/export, resume banner |
| `/workout/:dayId` | Workout | Active session (bottom nav hidden). `dayId=open` for freeform |
| `/workout-summary` | WorkoutSummary | Post-workout summary screen |
| `/progress` | Progress | Per-exercise charts (1RM, volume), PR dashboard |
| `/exercises` | Exercises | Exercise management |
| `/history` | History | Past workouts with edit mode |
| `/history/:workoutId/edit` | HistoryEdit | Edit a past workout |
