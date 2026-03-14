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
│   ├── exerciseStore.ts # Zustand: custom exercises, name overrides, weight mode, equipment overrides (key: hd_exercises)
│   └── settingsStore.ts # Zustand: program selection, rest timer, auto-start timer, gym equipment profile, custom gym equipment, cardio log settings (key: hd_settings)
├── data/
│   ├── exercises.ts     # Static exercise catalog (~49 exercises) + lookup helpers + auto-replacement
│   ├── programs.ts      # Program definitions (days, cardio/rest days)
│   └── quotes.ts        # Mike Mentzer quotes
├── lib/
│   ├── overload.ts      # Progressive overload algorithm (pure function, bodyweight-aware) + Mentzer warm-up/working set creation
│   ├── stats.ts         # Workout stats (volume, sets, progress comparison)
│   ├── charts.ts        # Exercise session aggregation, 1RM estimation (Epley), PR extraction
│   ├── curatedWorkout.ts # Gym equipment profile + curated workout builder per lift focus (returns CurateResult)
│   ├── dates.ts         # Shared date formatting (relative dates, day·date, month/year)
│   ├── records.ts       # Per-set PR detection (weight, reps, volume) against history
│   ├── recovery.ts      # Muscle recovery status (per-group days since trained) + rest day activity suggestions + group skip history
│   └── export.ts        # JSON/CSV export (includes dayType column), import validation + merge logic
├── hooks/
│   ├── useTimer.ts      # Countdown timer (rest between sets)
│   ├── useOverload.ts   # Connects overload logic to workout history
│   └── useElapsedTimer.ts # Elapsed time since workout start (M:SS format)
├── pages/
│   ├── Home.tsx            # Monthly calendar (color-coded by day type), bento stats grid, muscle recovery card, rest day suggestions, resume banner, backup/export
│   ├── Workout.tsx         # Active workout logging (program days + open/freeform + gym curation + cardio/recovery logging + recovery warnings)
│   ├── WorkoutSummary.tsx  # Post-finish summary (stats, exercise list, history link)
│   ├── Progress.tsx        # Per-exercise charts (1RM trend, volume bars), PR dashboard
│   ├── History.tsx         # Past workouts with inline edit, delete + exercise filter
│   ├── Exercises.tsx       # Exercise management (rename, add, remove)
│   └── MyGym.tsx           # Gym equipment management (toggle, add/edit/remove custom, select all/deselect all, bulk delete)
└── components/
    ├── ExerciseCard.tsx         # Shared exercise card (used by Workout + History edit)
    ├── ExercisePickerModal.tsx  # Shared full-screen exercise picker (swap/add modes)
    ├── StepperInput.tsx         # Reusable ±stepper with long-press support (weight/rep inputs)
    └── layout/
        ├── PageLayout.tsx   # Safe-area-aware page wrapper
        └── BottomNav.tsx    # 5-tab bar: Home, Progress, Exercises, My Gym, History (hidden during active workout)
```

### Key Patterns

- **No backend/API** — all data is client-side. Workout history persists in localStorage via Zustand `persist` middleware.
- **Static exercise/program data** — defined in `src/data/`, looked up via `Map` helpers (`exerciseMap`, `programMap`). Currently only one program: `heavy-duty-complete`. Program days have a `type` field (`lift`, `cardio`, `recovery`, `rest`).
- **Progressive overload** — `lib/overload.ts` is a pure function: given an exercise definition and last session's sets, returns a suggestion (increase/maintain/decrease weight). Progression decisions focus on working sets (to-failure) only, ignoring warm-up sets. Bodyweight exercises (`equipment: 'bodyweight+'`) get rep-focused messages instead of weight-focused.
- **Mentzer warm-up/working set protocol** — `createMentzerSets()` in `lib/overload.ts` generates 2 sets per exercise: Set 1 = warm-up at 50% working weight (not to failure), Set 2 = working set to failure. Both use `4-1-4` tempo. ExerciseCard shows "W-up" / "Work" labels on the set number column when exactly 2 sets exist.
- **Equipment switching** — each exercise card has a tappable equipment badge that opens an inline picker (barbell/dumbbells/cable/machine/BW+). Overrides persist in `exerciseStore.equipmentOverride` (keyed by exercise ID). `getEffectiveExercise()` in `data/exercises.ts` applies equipment overrides after name overrides.
- **Gym equipment curation** — `lib/curatedWorkout.ts` defines labeled `CuratedSlot[]` templates per lift focus (Push: 6 slots, Pull: 6 slots, Legs & Abs: 5 slots). Each slot has ranked candidates with `isAvailable(profile)` checks. `curateWorkoutForFocus(focus, profile, options?)` returns a `CurateResult { exerciseIds, skippedSlots }`. Default mode picks the first available candidate (machine > barbell > dumbbell priority); `{ shuffle: true, avoid }` randomly picks among available candidates, preferring exercises not in the `avoid` list (current workout IDs) so repeated shuffles produce visible changes. Skipped slots (no available equipment) are reported in `skippedSlots` with human-readable labels, shown as a yellow warning in the UI. Workout page shows a "Curate from My Gym" section on lift days with "Build Workout" (deterministic) and "Try Another Split" (randomized) buttons. Curation is locked once any set is logged to prevent overwriting data. Profile persists in `settingsStore.gymEquipment` (type: `Record<string, boolean>` to support custom IDs). Equipment management has a dedicated `/my-gym` page.
- **My Gym CRUD** — `/my-gym` page supports toggling built-in equipment, adding custom equipment (name + category via bottom sheet), editing custom equipment (rename, change category), removing individual items, select all / deselect all per category, and bulk select mode with multi-delete. Custom equipment stored in `settingsStore.customGymEquipment`. Store actions: `addCustomGymEquipment`, `updateCustomGymEquipment`, `removeCustomGymEquipment`, `bulkSetGymEquipmentAvailability`, `bulkRemoveCustomGymEquipment`.
- **Cardio/rest day tracking** — program days with `type: 'cardio'` or `type: 'recovery'` show activity suggestions from `cardioActivities` map in `data/programs.ts`. Workout page renders a "Mark as Done" button to log a cardio/recovery session. `WorkoutEntry.dayType` field (`DayType = 'lift' | 'cardio' | 'recovery' | 'rest'`) persists the session type. Calendar on Home is color-coded: green for lifts, blue for cardio, blue/60 for recovery, subtle dots for scheduled rest days with no activity.
- **Muscle recovery status** — `lib/recovery.ts` exports `getMuscleRecoveryStatus(history)` which scans the last 30 lift entries and returns per-group recovery status (recovering <4 days, recovered 4d+, never trained). Displayed as a bento card on Home with color-coded pills (orange=recovering, green=ready). Workout page shows a recovery warning banner when targeted muscle groups are still recovering. `muscleToGroup` Map is exported for shared muscle-to-group lookups (used by Workout.tsx recovery banner instead of duplicating the mapping inline).
- **Skip muscle group (bulk skip)** — recovery banner on Workout page includes "Skip [Group] this week" buttons that skip all exercises targeting a recovering muscle group in one tap. Uses `getGroupSkipHistory(history)` from `lib/recovery.ts` which counts consecutive sessions where all exercises for a group were skipped. Three-tier anti-chronic-skip safeguard: 0 consecutive skips = normal yellow skip button, 1 consecutive skip = amber warning with "Skip anyway" button, 2+ consecutive skips = red text blocking skip (no button). Skipping operates on exercise indices in descending order to preserve array positions.
- **Rest day activity suggestions** — `lib/recovery.ts` exports `getRestDaySuggestion(daysSinceLastActivity)` returning typed suggestions (full-rest, active-recovery, light-cardio) with randomized activity picks from program cardio definitions. Shown on Home on rest/recovery days or when 2+ days inactive.
- **Bodyweight exercise mode** — exercises with `equipment: 'bodyweight+'` default to reps-only (no Kg column). Users toggle "+ Add Weight" / "BW Only" per exercise. Preference persists in `exerciseStore.weightMode`.
- **Shared exercise card** — `ExerciseCard` component (`src/components/ExerciseCard.tsx`) renders the full exercise UI (name, equipment, rep range, bodyweight toggle, set inputs, swap/remove icons, inline remove confirmation). Used identically by both Workout and History edit pages. Manages bodyweight mode and remove-confirm state internally. Accepts optional `showOverloadBanner`, `overloadSuggestion`, `restButtons`, `onAutoReplace`, `onSkip`, `onUnskip`, and `onSetComplete` props (Workout-only features). When `entry.skipped === true`, renders a collapsed card with exercise name, "Skipped" badge, and 3-dot menu (Unskip/Swap/Remove). Set inputs use `StepperInput` component with ±buttons (weight step from `exercise.weightIncrement`, rep step = 1) and tappable "prev:" hints that auto-fill from last session.
- **Exercise picker modal** — shared `ExercisePickerModal` component (`src/components/ExercisePickerModal.tsx`) used by both Workout and History pages. Supports `mode: 'swap'` (replace exercise) and `mode: 'add'` (append exercise). Filters out exercises already in the workout. Groups candidates by muscle group. In swap mode, tapping an exercise shows an action sheet with "Swap" and "Add to Workout" options via the `onSelectWithAction` prop. Includes a "Create new exercise" button (bottom of list + empty state) that triggers a creation flow via `showCreate` state.
- **Exercise CRUD (active workout)** — swap exercise (picker modal), auto replace (random same-muscle-group swap), add exercise (dashed button, appends at end with overload suggestion), insert exercise at position (`+` divider buttons between groups), remove exercise (trash icon with inline confirmation), reorder (up/down arrows). Store actions: `addExerciseToWorkout`, `insertExerciseAtIndex`, `removeExerciseFromWorkout`.
- **Auto replace exercise** — 3-dot menu "Auto Replace" option (blue accent, shuffle icon) instantly swaps the exercise for a random alternative targeting the same muscle group. `getAutoReplacement(exerciseId, excludeIds)` in `data/exercises.ts` finds candidates from `getEffectiveExercisesByGroup`, prioritizing same `type` (compound/isolation) and same `primaryMuscles[0]`, then picks randomly. Excludes exercises already in the workout. Falls back to a feedback toast if no alternatives exist. Only available during active workouts (not history edit).
- **Exercise CRUD (history edit)** — identical card UI to active workout. Swap exercise (preserves existing sets, changes exercise identity only), add exercise (appends with empty sets), remove exercise, modify sets/reps/weight. All changes saved atomically via `updateHistoryEntry`. Overload banner and rest timer are omitted.
- **Open workout** — `/workout/open` starts a freeform session with no predefined exercises. Exercise picker opens automatically on entry. Day card on Home uses dashed yellow border. `dayId: "open"` is stored in history and colored `accent-yellow`.
- **Per-exercise last-done dates** — Home page day cards list each exercise with its last-done date (sourced from `getExerciseLastDoneDate` in `workoutStore`). Exercise list comes from last session history or falls back to the program definition.
- **Bento stats grid** — Home page displays stat cards: Streak (consecutive days), Total Workouts (1-col each), Last Session (col-span-2, day focus + relative date), This Month (col-span-2, mini calendar grid with M–S headers, color-coded circles by day type, ring for today, session count), Muscle Recovery (col-span-2, per-group recovery pills), and Rest Day Suggestions (col-span-2, context-aware activity nudges).
- **History delete workout** — expanded history cards show a trash icon next to "Edit Workout". Tapping it shows an inline red confirmation (matching the "Clear All Data" pattern). Uses `deleteHistoryEntry(workoutId)` store action.
- **History exercise filter** — clicking an exercise tag in collapsed history cards filters the list to workouts containing that exercise. Active filter shows as a dismissible chip above results.
- **History card titles** — card headers strip the "Day N — " prefix from `workout.day`, showing just the focus (e.g., "Chest, Shoulders, Triceps"). Dates always show "Day · Date" format (e.g., "Mon · Feb 23"). Cardio/recovery entries display type badges with distinct styling.
- **Skip exercise (alternate exercises)** — exercises can be skipped for the current session via 3-dot menu ("Skip This Week"). Skipped exercises render as collapsed single-line cards with a "Skipped" badge. `ExerciseEntry.skipped?: boolean` flag is backwards-compatible. Skipped exercises are preserved in history so they seed back next session (unskipped). `getLastSets`, `getExerciseLastDoneDate`, `getExerciseHistory` all skip over entries where `skipped === true`. `calcStats` excludes skipped exercises from totals. History and WorkoutSummary pages show skipped exercises with distinct styling.
- **Save/resume workout** — `activeWorkout` is automatically persisted to localStorage via Zustand `persist` middleware on every state change. No explicit save needed. Home page shows a green "In Progress" resume banner when `activeWorkout !== null`. Navigating to a different day while a workout is active shows a conflict dialog (Resume / Discard & Start New). The X button mid-workout shows a 3-option dialog: "Keep Going", "Go to Home" (navigates home without cancelling — workout stays active for resume), and "Cancel Workout" (discards). A `leavingRef` in Workout.tsx prevents the `useEffect` from re-creating a workout during the AnimatePresence exit animation after finishing, cancelling, or navigating home.
- **Exercise reorder** — up/down arrows per exercise group during active workout. Not available in history edit (order has no functional impact on logged data).
- **Auto-start rest timer** — when a set is completed (checkmark toggle), the rest timer auto-starts using the exercise's `restSeconds`. Controlled by `settingsStore.autoStartTimer` (default: true). Toggle visible in the rest timer modal.
- **Stepper inputs** — `StepperInput` component (`src/components/StepperInput.tsx`) wraps number inputs with `[-]` / `[+]` buttons. Long-press for rapid increment via `useRef`-based interval. Weight step respects `exercise.weightIncrement`; rep step is always 1. Tappable "prev:" hints auto-fill from last session.
- **Data export & backup** — collapsible "Backup & Export" section on Home page. `lib/export.ts` handles JSON export (full backup: workouts + exercises + settings), CSV export (flat: one row per set, includes `dayType` column), and import with validation + deduplication by workout ID. Import uses `workoutStore.importHistory()`.
- **Progress charts & PR dashboard** — `/progress` route with `recharts` library. Two-level exercise picker: muscle group tabs (All/Chest/Back/Shoulders/Arms/Traps/Legs/Abs — only groups with tracked data shown) filter a grouped or flat exercise list below. Each exercise pill shows session count. Active exercise header displays name, muscles, equipment, and type. Color-coded PR badges use the exercise's muscle accent color (colored top stripe + icon). Pill-style 1RM/Volume chart toggle. `lib/charts.ts` provides pure aggregation functions. `groupColors` map in Progress.tsx assigns per-group colors; `muscleToGroup` map links muscle IDs to `exerciseGroups` labels.
- **Shared date formatting** — `lib/dates.ts` provides `formatRelativeDate` ("Today"/"3 days ago"), `formatRelativeDateShort` ("3d ago"), `formatDayDate` ("Mon · Mar 14"), and `formatMonthYear` ("March 2026"). Used by Home, History, and HistoryEdit pages — avoid duplicating date logic in page components.
- **Mobile-first PWA** — max-width 460px, safe-area insets, portrait orientation, standalone display. Bottom nav hides on workout route.

### Curation Templates

Each lift focus has a slot template. Slots are filled top-to-bottom; skipped slots (no matching equipment) are reported in the UI.

| Push (6 slots) | Pull (6 slots) | Legs & Abs (5 slots) |
|---|---|---|
| Chest Fly | Lat Isolation | Quad Isolation |
| Chest Press | Lat Compound | Quad Compound |
| Shoulder Press | Row | Leg Curl |
| Lateral Raise | Rear Delt | Calf Raise |
| Tricep Isolation | Shrugs | Ab Crunch |
| Tricep Compound | Bicep Curl | |

### Design System

Defined in `src/index.css` `@theme` block (Tailwind v4 syntax):
- **Fonts**: Bebas Neue (display/headings via `--font-display`), Outfit (body via `--font-body`)
- **Colors**: Dark theme only. Semantic tokens: `bg-primary`, `bg-card`, `bg-input`, `text-primary/secondary/muted/dim`, `border`, `border-card`. Accent colors: `accent-red` (primary CTA), `accent-orange/yellow/green/blue`.
- Use Tailwind utility classes with these custom tokens (e.g., `bg-bg-card`, `text-text-muted`, `border-accent-red/30`).

### Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/` | Home | Color-coded calendar, stats, muscle recovery, rest day suggestions, backup/export, resume banner |
| `/workout/:dayId` | Workout | Active session (bottom nav hidden). `dayId=open` for freeform. Cardio/recovery days show activity suggestions + "Mark as Done" |
| `/workout-summary` | WorkoutSummary | Post-workout summary screen |
| `/progress` | Progress | Muscle-group-categorized exercise picker, per-exercise charts (1RM, volume), color-coded PR dashboard |
| `/exercises` | Exercises | Exercise management |
| `/my-gym` | MyGym | Gym equipment management (toggle, CRUD custom items, bulk operations) |
| `/history` | History | Past workouts with edit mode, cardio/recovery type badges |
| `/history/:workoutId/edit` | HistoryEdit | Edit a past workout |
