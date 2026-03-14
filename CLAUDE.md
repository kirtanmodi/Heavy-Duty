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
├── App.tsx              # BrowserRouter + route definitions + PwaInstallPrompt
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
│   ├── dates.ts         # Date-key abstraction (YYYY-MM-DD keys, UTC-based day math) + shared formatting (relative dates, day·date, month/year) + daysSinceLastSession
│   ├── records.ts       # Per-set PR detection (weight, reps, volume) against history
│   ├── recovery.ts      # Muscle recovery status (per-group days since trained, uses date-key primitives) + rest day activity suggestions + group skip history + smart day suggestions
│   ├── rollingSchedule.ts # Rolling program cycle: history-aware projection that interleaves logged days with planned days, non-lift type matching, rest-day skipping after 48h+ gaps, stalest-lift-first resumption
│   └── export.ts        # v2 full-state backup (all 3 stores) + CSV export, v1 backward-compatible import, runtime field validation
├── hooks/
│   ├── useTimer.ts      # Countdown timer (rest between sets)
│   ├── useOverload.ts   # Connects overload logic to workout history
│   └── useElapsedTimer.ts # Elapsed time since workout start (M:SS format)
├── pages/
│   ├── Home.tsx            # Suggested hero + "Other Options" grid (all day types), "Done for Today" card, interactive calendar (with "Schedule →" shortcut), stats grid, muscle recovery card, rest day suggestions, resume banner, full-state backup/export
│   ├── Workout.tsx         # Active workout logging (program days + open/freeform + gym curation + cardio/recovery logging + recovery warnings)
│   ├── WorkoutSummary.tsx  # Post-finish summary (stats, exercise list, history link)
│   ├── Progress.tsx        # Per-exercise charts (1RM trend, volume bars), PR dashboard. Supports deep-link via `location.state.tab` ("schedule" → opens Schedule tab)
│   ├── History.tsx         # Past workouts with inline edit, delete + exercise filter
│   ├── Exercises.tsx       # Exercise management (rename, add, remove)
│   └── MyGym.tsx           # Gym equipment management (toggle, add/edit/remove custom, select all/deselect all, bulk delete)
└── components/
    ├── ExerciseCard.tsx         # Shared exercise card (mode: "workout" | "history-edit" for context-aware styling)
    ├── ExercisePickerModal.tsx  # Shared full-screen exercise picker (swap/add modes, sheet-surface design)
    ├── PwaInstallPrompt.tsx     # PWA install banner (beforeinstallprompt + iOS fallback, route-aware visibility)
    ├── Schedule.tsx             # Rolling cycle schedule view (upcoming days from history-based cycle, recovery pills, staleness, lead-time chips, cycle context reasons, smart warnings, start buttons)
    ├── StepperInput.tsx         # Reusable ±stepper with long-press + touch-target support (weight/rep inputs)
    └── layout/
        ├── PageLayout.tsx   # Safe-area-aware page wrapper
        └── BottomNav.tsx    # 5-tab floating pill nav: Home, Progress, Exercises, My Gym, History (hidden during active workout)
```

### Key Patterns

- **No backend/API** — all data is client-side. Workout history persists in localStorage via Zustand `persist` middleware.
- **Static exercise/program data** — defined in `src/data/`, looked up via `Map` helpers (`exerciseMap`, `programMap`). Currently only one program: `heavy-duty-complete` with an 8-day rolling cycle: Push → Rest → Pull → Rest → Legs → Cardio → Recovery → Rest. All `dayOfWeek` values are `0` (no fixed weekday binding). Program days have a `type` field (`lift`, `cardio`, `recovery`, `rest`). Cardio activities are consolidated under a single `hd-cardio` key (both steady-state and interval options).
- **Progressive overload** — `lib/overload.ts` is a pure function: given an exercise definition and last session's sets, returns a suggestion (increase/maintain/decrease weight). Progression decisions focus on working sets (to-failure) only, ignoring warm-up sets. Bodyweight exercises (`equipment: 'bodyweight+'`) get rep-focused messages instead of weight-focused.
- **Mentzer warm-up/working set protocol** — `createMentzerSets()` in `lib/overload.ts` generates 2 sets per exercise: Set 1 = warm-up at 50% working weight (not to failure), Set 2 = working set to failure. Both use `4-1-4` tempo. ExerciseCard shows "W-up" / "Work" labels on the set number column when exactly 2 sets exist.
- **Equipment switching** — each exercise card has a tappable equipment badge that opens an inline picker (barbell/dumbbells/cable/machine/BW+). Overrides persist in `exerciseStore.equipmentOverride` (keyed by exercise ID). `getEffectiveExercise()` in `data/exercises.ts` applies equipment overrides after name overrides.
- **Gym equipment curation** — `lib/curatedWorkout.ts` defines labeled `CuratedSlot[]` templates per lift focus (Push: 6 slots, Pull: 6 slots, Legs & Abs: 5 slots). Each slot has ranked candidates with `isAvailable(profile)` checks. `curateWorkoutForFocus(focus, profile, options?)` returns a `CurateResult { exerciseIds, skippedSlots }`. Default mode picks the first available candidate (machine > barbell > dumbbell priority); `{ shuffle: true, avoid }` randomly picks among available candidates, preferring exercises not in the `avoid` list (current workout IDs) so repeated shuffles produce visible changes. Skipped slots (no available equipment) are reported in `skippedSlots` with human-readable labels, shown as a yellow warning in the UI. Workout page shows a "Curate from My Gym" section on lift days with "Build Workout" (deterministic) and "Try Another Split" (randomized) buttons. Curation is locked once any set is logged to prevent overwriting data. Profile persists in `settingsStore.gymEquipment` (type: `Record<string, boolean>` to support custom IDs). Equipment management has a dedicated `/my-gym` page.
- **My Gym CRUD** — `/my-gym` page supports toggling built-in equipment, adding custom equipment (name + category via bottom sheet), editing custom equipment (rename, change category), removing individual items, select all / deselect all per category, and bulk select mode with multi-delete. Custom equipment stored in `settingsStore.customGymEquipment`. Store actions: `addCustomGymEquipment`, `updateCustomGymEquipment`, `removeCustomGymEquipment`, `bulkSetGymEquipmentAvailability`, `bulkRemoveCustomGymEquipment`.
- **Cardio/rest/recovery day tracking** — program days with `type: 'cardio'` or `type: 'recovery'` show activity suggestions from `cardioActivities` map in `data/programs.ts`. Workout page renders a "Mark as Done" button to log a cardio/recovery session. Home page "Other Options" grid includes quick-log cards for Cardio, Recovery, and Rest that call `logCardioSession()` directly without navigation. `MANUAL_ACTIVITY` maps `cardio`/`recovery`/`rest` to `manual-cardio`/`manual-recovery`/`manual-rest` dayIds. `logCardioSession` accepts an optional `dateKey` param for backdating. `WorkoutEntry.dayType` field (`DayType = 'lift' | 'cardio' | 'recovery' | 'rest'`) persists the session type. Calendar on Home is color-coded: green for lifts, blue for cardio, blue/60 for recovery, subtle dots for scheduled rest days with no activity.
- **Muscle recovery status** — `lib/recovery.ts` exports `getMuscleRecoveryStatus(history)` which scans the last 30 lift entries (excluding future-dated entries) and returns per-group recovery status (recovering <4 days, recovered 4d+, never trained). Uses `getEffectiveExercise()` to resolve custom/swapped exercises (falls back to `exerciseMap` for static lookups). Displayed as a bento card on Home with color-coded pills (orange=recovering, green=ready). Workout page shows a recovery warning banner when targeted muscle groups are still recovering. `muscleToGroup` Map is exported for shared muscle-to-group lookups (used by Workout.tsx recovery banner instead of duplicating the mapping inline). `getDaysSinceLastActivity` and `getGroupSkipHistory` also exclude future-dated entries.
- **Rolling program cycle** — `lib/rollingSchedule.ts` replaces the fixed Monday–Sunday day-of-week mapping. The cycle is **history-aware**: it scans each date from `startDateKey` forward, skipping dates that already have logged sessions and advancing the cycle index when a logged session matches a program day. **Non-lift type matching**: manually-logged cardio/recovery/rest entries (with `manual-*` dayIds) advance the cycle past any non-lift program day — `isNonLiftTypeMatch()` treats all non-lift types as interchangeable for cycle advancement, so quick-logging cardio on a rest day still moves the schedule forward. Lift days require exact `dayId` match. **Rest-day skipping**: when 48h+ have passed since the last lift, `skipRedundantRestDays()` fast-forwards past non-lift cycle days to the next lift day — rest days exist to enforce recovery gaps, so they're redundant after an actual gap. **Stalest-lift-first after gaps**: `resolveStartingCycleIndex()` calls `getMostStaleLiftDayIndex()` to pick the least-recently-done lift day (never-done > oldest > cycle-order tiebreak) instead of blindly rewinding to a recently-completed one. `getNextCycleIndexFromDate` anchors from the last program-day ID match, then forward-scans intermediate manual entries to compute the correct starting index. `RollingScheduleSlot` extends `RollingProgramDay` with `cycleIndex`, `source: "planned" | "logged-program" | "logged-manual"`, and optional `workout` reference. Key exports: `getUpcomingRollingDays(programDays, history, count, startDateKey)` returns a mixed list of logged + planned slots (used by Schedule); `getUpcomingOpenRollingDays(...)` returns only planned/open slots (used by Home hero); `getRollingDayAtOffset(...)` returns a single projected day skipping logged dates (used by calendar future rings).
- **Smart day suggestions** — `lib/recovery.ts` exports `getLiftDayGroups(day)` (maps a ProgramDay's exercises to muscle group labels) and two suggestion functions. `getSmartProgramDaySuggestion(programDay, programDays, recoveryStatuses, enableAdaptation?)` takes a ProgramDay directly and returns a `SmartSuggestion { type, reason?, suggestion? }`. `getSmartDaySuggestion(dow, dateOffset, programDays, recoveryStatuses)` is the legacy wrapper that resolves by day-of-week. When adaptation is enabled and a lift day's target muscles are recovering, ranks alternative lift days by recovery readiness (% of muscle groups recovered), preferring fully recovered alternatives ("Do X instead — fully recovered") over partially recovered ones ("Do X instead — Y recovered"), falling back to cardio ("Do cardio instead") if no groups are recovered. Used by Home calendar (amber rings for adapted days), Home hero (recovery suggestion banner), and Schedule component (warning + suggestion text on lift cards).
- **Skip muscle group (bulk skip)** — recovery banner on Workout page includes "Skip [Group] this week" buttons that skip all exercises targeting a recovering muscle group in one tap. Uses `getGroupSkipHistory(history)` from `lib/recovery.ts` which counts consecutive sessions where all exercises for a group were skipped. Three-tier anti-chronic-skip safeguard: 0 consecutive skips = normal yellow skip button, 1 consecutive skip = amber warning with "Skip anyway" button, 2+ consecutive skips = red text blocking skip (no button). Skipping operates on exercise indices in descending order to preserve array positions.
- **Rest day activity suggestions** — `lib/recovery.ts` exports `getRestDaySuggestion(daysSinceLastActivity)` returning typed suggestions (full-rest, active-recovery, light-cardio) with randomized activity picks from program cardio definitions (`hd-cardio` for light cardio, `hd-saturday` for recovery activities). Shown on Home on rest/recovery days or when 2+ days inactive.
- **Bodyweight exercise mode** — exercises with `equipment: 'bodyweight+'` default to reps-only (no Kg column). Users toggle "+ Add Weight" / "BW Only" per exercise. Preference persists in `exerciseStore.weightMode`.
- **Shared exercise card** — `ExerciseCard` component (`src/components/ExerciseCard.tsx`) renders the full exercise UI (name, equipment, rep range, bodyweight toggle, set inputs, swap/remove icons, inline remove confirmation). Accepts a `mode` prop (`"workout" | "history-edit"`, default `"workout"`) for context-aware styling (different gradient directions, border opacities, button labels, and a helper hint in history-edit mode). Manages bodyweight mode and remove-confirm state internally. Accepts optional `showOverloadBanner`, `overloadSuggestion`, `restButtons`, `onAutoReplace`, `onSkip`, `onUnskip`, and `onSetComplete` props (Workout-only features). When `entry.skipped === true`, renders a collapsed card with exercise name, "Skipped" badge, and 3-dot menu (Unskip/Swap/Remove). Set inputs use `StepperInput` component with ±buttons (weight step from `exercise.weightIncrement`, rep step = 1) and tappable "prev:" hints that auto-fill from last session.
- **Exercise picker modal** — shared `ExercisePickerModal` component (`src/components/ExercisePickerModal.tsx`) used by both Workout and History pages. Supports `mode: 'swap'` (replace exercise) and `mode: 'add'` (append exercise). Filters out exercises already in the workout. Groups candidates by muscle group. In swap mode, tapping an exercise shows an action sheet with "Swap" and "Add to Workout" options via the `onSelectWithAction` prop. Includes a "Create new exercise" button (bottom of list + empty state) that triggers a creation flow via `showCreate` state.
- **Exercise CRUD (active workout)** — swap exercise (picker modal), auto replace (random same-muscle-group swap), add exercise (dashed button, appends at end with overload suggestion), insert exercise at position (`+` divider buttons between groups), remove exercise (trash icon with inline confirmation), reorder (up/down arrows). Store actions: `addExerciseToWorkout`, `insertExerciseAtIndex`, `removeExerciseFromWorkout`.
- **Auto replace exercise** — 3-dot menu "Auto Replace" option (blue accent, shuffle icon) instantly swaps the exercise for a random alternative targeting the same muscle group. `getAutoReplacement(exerciseId, excludeIds)` in `data/exercises.ts` finds candidates from `getEffectiveExercisesByGroup`, prioritizing same `type` (compound/isolation) and same `primaryMuscles[0]`, then picks randomly. Excludes exercises already in the workout. Falls back to a feedback toast if no alternatives exist. Only available during active workouts (not history edit).
- **Exercise CRUD (history edit)** — identical card UI to active workout. Swap exercise (preserves existing sets, changes exercise identity only), add exercise (appends with empty sets), remove exercise, modify sets/reps/weight. All changes saved atomically via `updateHistoryEntry`. Overload banner and rest timer are omitted.
- **Open workout** — `/workout/open` starts a freeform session with no predefined exercises. Exercise picker opens automatically on entry. Day card on Home uses dashed yellow border. `dayId: "open"` is stored in history and colored `accent-yellow`.
- **Per-exercise last-done dates** — Home page day cards list each exercise with its last-done date (sourced from `getExerciseLastDoneDate` in `workoutStore`). Exercise list comes from last session history or falls back to the program definition.
- **Home layout** — Quick Start section (resume banner, suggested hero card, "Other Options" grid), Stats section (Streak, Total Workouts, Last Session cards), interactive calendar (tappable cells — tap any date to log cardio/rest, undo non-lift logs, or move lift workouts via date picker; future rings use rolling cycle projection skipping logged dates; "Schedule →" chip navigates to Progress schedule tab via route state), Muscle Recovery section, Rest Day suggestions, Backup & Export. **Quick Start states**: (1) Active workout → green resume banner, option grid hidden. (2) No session today → hero shows the rolling-cycle suggestion ("Suggested" label) with action button + "Other Options" grid below with remaining day types (Push/Pull/Legs/Cardio/Recovery/Rest/Open). Lift options navigate to `/workout/{dayId}`, non-lift options instant-log via `logManualActivity`, Open navigates to `/workout/open`. (3) Session logged today → hero replaced with "Done for Today" card (green checkmark, day name, "check the calendar to adjust"), all option cards disabled at `opacity-45`. `QUICK_OPTIONS` array defines the 7 options with key, label, type, dayId, accentColor, and icon; `filteredOptions` removes the suggested day to avoid duplication.
- **History delete workout** — expanded history cards show a trash icon next to "Edit Workout". Tapping it shows an inline red confirmation (matching the "Clear All Data" pattern). Uses `deleteHistoryEntry(workoutId)` store action.
- **History exercise filter** — clicking an exercise tag in collapsed history cards filters the list to workouts containing that exercise. Active filter shows as a dismissible chip above results.
- **History card titles** — card headers strip the "Day N — " prefix from `workout.day`, showing just the focus (e.g., "Chest, Shoulders, Triceps"). Dates always show "Day · Date" format (e.g., "Mon · Feb 23"). Cardio/recovery entries display type badges with distinct styling.
- **Skip exercise (alternate exercises)** — exercises can be skipped for the current session via 3-dot menu ("Skip This Week"). Skipped exercises render as collapsed single-line cards with a "Skipped" badge. `ExerciseEntry.skipped?: boolean` flag is backwards-compatible. Skipped exercises are preserved in history so they seed back next session (unskipped). `getLastSets`, `getExerciseLastDoneDate`, `getExerciseHistory` all skip over entries where `skipped === true`. `calcStats` excludes skipped exercises from totals. History and WorkoutSummary pages show skipped exercises with distinct styling.
- **Save/resume workout** — `activeWorkout` is automatically persisted to localStorage via Zustand `persist` middleware on every state change. No explicit save needed. Home page shows a green "In Progress" resume banner when `activeWorkout !== null`. Navigating to a different day while a workout is active shows a conflict dialog (Resume / Discard & Start New). The X button mid-workout shows a 3-option dialog: "Keep Going", "Go to Home" (navigates home without cancelling — workout stays active for resume), and "Cancel Workout" (discards). A `leavingRef` in Workout.tsx prevents the `useEffect` from re-creating a workout during the AnimatePresence exit animation after finishing, cancelling, or navigating home.
- **Exercise reorder** — up/down arrows per exercise group during active workout. Not available in history edit (order has no functional impact on logged data).
- **Auto-start rest timer** — when a set is completed (checkmark toggle), the rest timer auto-starts using the exercise's `restSeconds`. Controlled by `settingsStore.autoStartTimer` (default: true). Toggle visible in the rest timer modal.
- **Stepper inputs** — `StepperInput` component (`src/components/StepperInput.tsx`) wraps number inputs with `[-]` / `[+]` buttons. Long-press for rapid increment via `useRef`-based interval. Weight step respects `exercise.weightIncrement`; rep step is always 1. Tappable "prev:" hints auto-fill from last session.
- **Data export & backup (v2)** — "Backup & Export" section on Home page. `lib/export.ts` handles JSON export (full-state backup: all 3 stores including `activeWorkout`, `lastCompletedWorkout`, exercise overrides, settings, gym equipment) and CSV export (flat: one row per set, includes `dayType` column). Import is **destructive** (wipe + restore via `clearAll()` + `restoreState()` across all stores, not additive merge). v1 backup format is detected and migrated on import with sensible defaults. Runtime field-by-field validation (`asStringRecord`, `asWeightModeRecord`, etc.) sanitizes imported data.
- **Progress charts & PR dashboard** — `/progress` route with `recharts` library. Charts/Schedule toggle at top (initializes from `location.state.tab` when deep-linked). Two-level exercise picker: muscle group tabs (All/Chest/Back/Shoulders/Arms/Traps/Legs/Abs — only groups with tracked data shown) filter a grouped or flat exercise list below. Each exercise pill shows session count. Active exercise header displays name, muscles, equipment, and type. Color-coded PR badges use the exercise's muscle accent color (colored top stripe + icon). Pill-style 1RM/Volume chart toggle. `lib/charts.ts` provides pure aggregation functions. `groupColors` map in Progress.tsx assigns per-group colors; `muscleToGroup` map links muscle IDs to `exerciseGroups` labels.
- **Schedule view** — `Schedule` component (`src/components/Schedule.tsx`) in the Progress page's "Schedule" tab. Shows the rolling program cycle (one full cycle from the next projected day) with date labels (e.g., "Mon · Mar 16"), type badge (Lift/Cardio/Recovery/Rest), focus description, exercise list with rep ranges (lift days), descriptions + duration (cardio/recovery), tips (rest days), and "Start Workout" buttons. **Cycle context**: each card shows a dim `getCycleReason()` line explaining why this day is here (e.g., "Lift 1 of 3 in your cycle. Day 1 of 8.", "Rest between Push and Pull. Muscles need at least 48h before the next lift.", cardio/recovery purpose). Uses `cycleIndex` from `RollingScheduleSlot`. **Logged-day awareness**: dates with existing sessions show a "Logged" chip, "Already logged" staleness text, logged-activity summary, and an info card instead of the start button; smart suggestions are suppressed for logged days. The first `source === "planned"` slot is highlighted as "Next Up" with a red ring. Each card shows a lead-time chip ("Today" / "Tomorrow" / "In 3d"). Recovery-enriched: shows per-muscle-group recovery pills (green=recovered, orange=recovering with day count) on all cards. Lift days with recovering muscles show amber warning + alternative suggestion. Uses `getEffectiveExercise()`, `getMuscleRecoveryStatus()`, `getLiftDayGroups()`, `getSmartProgramDaySuggestion()`, `getUpcomingRollingDays()`, and `daysSinceLastSession()`.
- **Date-key abstraction** — `lib/dates.ts` uses `YYYY-MM-DD` string keys as the canonical "day" type. `formatDateKey(date)` and `getIsoDateKey(iso)` convert to date keys; `parseDateKey(dateKey)` converts back to a `Date`. `daysBetweenDateKeys()` and `daysSinceIsoDate()` do UTC-based day math (eliminates timezone/DST bugs). `addDaysToDateKey(dateKey, days)` offsets a date key by N days. `createSessionIso(dateKey)` pins timestamps to noon local time. Also provides `formatRelativeDate` ("Today"/"Tomorrow"/"In 3 days"/"3 days ago"), `formatRelativeDateShort` ("3d ago"/"In 3d"), `formatDayDate` ("Mon · Mar 14"), `formatMonthYear` ("March 2026"), `getTodayDateKey()`, and `daysSinceLastSession(dayId, history)` (excludes future-dated entries). Used by all pages, `lib/recovery.ts`, and `lib/rollingSchedule.ts` — avoid duplicating date logic.
- **History sort invariant** — `sortHistory()` in `workoutStore` ensures chronological order after every mutation (`finishWorkout`, `logCardioSession`, `updateWorkoutDate`, `importHistory`, `restoreState`).
- **Workout date mutation** — `updateWorkoutDate(workoutId, dateKey)` store action allows moving a workout to a different date (re-sorts history after). Returns `false` if the target date already has a workout (collision guard via `hasWorkoutOnDate`). Future-date validation remains on the caller side.
- **One-session-per-day enforcement** — `finishWorkout()`, `logCardioSession()`, and `updateWorkoutDate()` all return `boolean` (`true` = success, `false` = blocked by existing entry on the same date). The shared `hasWorkoutOnDate(history, dateKey, excludeId?)` helper prevents duplicate entries per day at the store level. **UI enforcement**: Workout page blocks starting a new session when today already has a completed entry (shows a message directing to the calendar). `handleFinish`, `handleMarkDone`, quick-log buttons, and calendar move all check return values and show inline error messages. Calendar cells are tappable on future dates (future-date validation removed from workout date move).
- **Store restore/clear** — all 3 stores (`workoutStore`, `exerciseStore`, `settingsStore`) expose `restoreState()` for wholesale state replacement from backup. `exerciseStore` also has `clearAll()` for reset-before-restore. `settingsStore.restoreState` merges `gymEquipment` over defaults so new equipment added after backup still gets defaults.
- **Mobile-first PWA** — max-width 460px, safe-area insets, portrait orientation, `display_override: [window-controls-overlay, standalone]`. Full manifest with maskable icons, 3 app shortcuts (Open Workout, Progress, History). `PwaInstallPrompt` component handles `beforeinstallprompt` lifecycle (Chrome/Edge) with iOS fallback (manual "Add to Home Screen" instructions), dismiss persistence in localStorage, route-aware visibility (hidden on workout/edit routes). Bottom nav is a floating pill (`floating-nav` glass surface, `rounded-[1.75rem]`), hides on workout route.

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
- **Colors**: Dark theme only (`color-scheme: dark`). Apple HIG-aligned system colors: `accent-red` (#FF453A), `accent-orange` (#FF9F0A), `accent-yellow` (#FFD60A), `accent-green` (#30D158), `accent-blue` (#0A84FF). Semantic tokens: `bg-primary` (#090B11), `bg-card` (#121721), `text-primary/secondary/muted/dim`, `border`, `border-card`.
- **Background depth**: Multi-layer radial gradients on `html` + `.app-shell` pseudo-elements (blue/red glows + subtle grid pattern). No images.
- **Surface classes**: `surface-card` (gradient bg + border + shadow + backdrop-blur), `surface-card-muted` (lower contrast), `hero-surface` (red glow accent), `sheet-surface` (modal/bottom-sheet), `floating-nav` (glass pill nav).
- **Utility classes**: `section-label` (uppercase eyebrow), `section-caption` (muted description), `chip`/`chip-muted` (pill badges), `segmented-surface`/`segmented-active` (iOS segmented control), `interactive-row`, `input-shell`/`input-focus`, `touch-target` (44px min), `btn-primary` (gradient + shadow), `btn-secondary`, `btn-ghost`, `btn-tertiary`.
- Use Tailwind utility classes with custom tokens (e.g., `bg-bg-card`, `text-text-muted`) or the surface/utility classes above.

### Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/` | Home | Suggested hero + "Other Options" grid (all day types), "Done for Today" card, interactive calendar (tap to log/undo/move, future rings from rolling cycle, "Schedule →" shortcut to Progress), stats, muscle recovery, rest day suggestions, full-state backup/export, resume banner |
| `/workout/:dayId` | Workout | Active session (bottom nav hidden). `dayId=open` for freeform. Cardio/recovery days show activity suggestions + "Mark as Done" |
| `/workout-summary` | WorkoutSummary | Post-workout summary screen |
| `/progress` | Progress | Charts/Schedule toggle (deep-linkable via `location.state.tab`), muscle-group-categorized exercise picker, per-exercise charts (1RM, volume), color-coded PR dashboard, rolling cycle schedule |
| `/exercises` | Exercises | Exercise management |
| `/my-gym` | MyGym | Gym equipment management (toggle, CRUD custom items, bulk operations) |
| `/history` | History | Past workouts with edit mode, cardio/recovery type badges |
| `/history/:workoutId/edit` | HistoryEdit | Edit a past workout |
