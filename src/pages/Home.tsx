import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getProgram } from "../data/programs";
import { exportJSON, exportCSV, validateImport } from "../lib/export";
import { prefetchRoute } from "../lib/routePrefetch";
import {
  getMuscleRecoveryStatus,
  getDaysSinceLastActivity,
  getRestDaySuggestion,
  getSmartProgramDaySuggestion,
} from "../lib/recovery";
import { getRollingDayAtOffset, getUpcomingOpenRollingDays } from "../lib/rollingSchedule";
import { useExerciseStore } from "../store/exerciseStore";
import { useSettingsStore } from "../store/settingsStore";
import { useWorkoutStore } from "../store/workoutStore";
import type { DayType, ProgramDay, WorkoutEntry } from "../types";
import {
  addDaysToDateKey,
  createSessionIso,
  daysBetweenDateKeys,
  formatDateKey,
  formatDayDate,
  formatRelativeDateShort,
  getIsoDateKey,
  daysSinceLastSession,
} from "../lib/dates";

type HistoryPreview = { dayId: string; date: string };
type CalendarEntryKind = "empty" | "nonLift" | "lift";
type CalendarCell = {
  day: number;
  dateKey?: string;
  dayType: DayType | null;
  isToday: boolean;
  isRest: boolean;
  isFuture: boolean;
  suggestedType: DayType | null;
  reason?: string;
  suggestion?: string;
  entryKind?: CalendarEntryKind;
  workout?: WorkoutEntry;
};

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-4 w-4 shrink-0",
  "aria-hidden": true,
} as const;

const ACTIVITY_ICONS: Record<string, ReactNode> = {
  cardio: (
    <svg {...iconProps}>
      <path d="M3 12h4l3-7 4 14 3-7h4" />
    </svg>
  ),
  rest: (
    <svg {...iconProps}>
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  ),
  lift: (
    <svg {...iconProps}>
      <path d="M6.5 6.5v11M17.5 6.5v11M6.5 12h11M4 8v8M20 8v8" />
    </svg>
  ),
};

const ChevronIcon = ({ direction = "right", className = "" }: { direction?: "right" | "down" | "left"; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={`h-4 w-4 shrink-0 ${className}`}
  >
    <path d={direction === "down" ? "M6 9l6 6 6-6" : direction === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
  </svg>
);

const MANUAL_ACTIVITY = {
  cardio: { dayId: "manual-cardio", dayName: "Cardio" },
  recovery: { dayId: "manual-recovery", dayName: "Recovery" },
  rest: { dayId: "manual-rest", dayName: "Rest Day" },
} as const;

type QuickOptionType = "lift" | "cardio" | "recovery" | "rest" | "open";

interface QuickOption {
  key: string;
  label: string;
  type: QuickOptionType;
  dayId: string;
}

const QUICK_OPTIONS: QuickOption[] = [
  { key: "hd-monday", label: "Push", type: "lift", dayId: "hd-monday" },
  { key: "hd-wednesday", label: "Pull", type: "lift", dayId: "hd-wednesday" },
  { key: "hd-friday", label: "Legs & Abs", type: "lift", dayId: "hd-friday" },
  { key: "manual-cardio", label: "Cardio", type: "cardio", dayId: "manual-cardio" },
  { key: "manual-recovery", label: "Recovery", type: "recovery", dayId: "manual-recovery" },
  { key: "manual-rest", label: "Rest", type: "rest", dayId: "manual-rest" },
  { key: "open", label: "Open workout", type: "open", dayId: "open" },
];

function getLastDoneMeta(day: ProgramDay, history: HistoryPreview[]) {
  const daysSince = daysSinceLastSession(day.id, history);
  if (daysSince === null) return { label: "Never done", tone: "quiet" as const };
  if (daysSince === 0) return { label: "Done today", tone: "ready" as const };

  const todayDateKey = formatDateKey(new Date());
  const entry = history.find(
    (workout) => workout.dayId === day.id && getIsoDateKey(workout.date) <= todayDateKey,
  );
  return {
    label: entry ? formatRelativeDateShort(entry.date) : `${daysSince}d ago`,
    tone: daysSince >= 4 ? "warning" as const : "muted" as const,
  };
}

function getLastDoneText(meta: ReturnType<typeof getLastDoneMeta>) {
  if (meta.tone === "quiet" || meta.tone === "ready") return meta.label;
  return `Last done ${meta.label === "Yesterday" ? "yesterday" : meta.label}`;
}

function getPlannedDayMetric(day: ProgramDay) {
  if (day.type === "lift") return `${day.exercises.length} exercises`;
  if (day.duration) return day.duration;
  return day.type === "rest" ? "Full rest" : day.focus;
}

function getPlannedDayActionLabel(day: ProgramDay) {
  if (day.type === "lift") return "Start workout";
  if (day.type === "cardio") return "Open cardio day";
  if (day.type === "recovery") return "Open recovery day";
  return "Open rest day";
}

/** Text treatment for a calendar date number. */
function getCalendarNumberClass(cell: CalendarCell) {
  if (cell.isToday) return "bg-text-primary font-semibold text-bg-primary";
  if (cell.dayType) return "font-medium text-text-primary";
  if (cell.isFuture || cell.suggestedType) return "text-text-secondary";
  return "text-text-muted";
}

/** Small dot under a date: solid for logged sessions, faint for the projected plan. */
function getCalendarDotClass(cell: CalendarCell) {
  if (cell.dayType === "lift") return "bg-accent-green";
  if (cell.dayType === "cardio") return "bg-accent-blue";
  if (cell.dayType === "recovery") return "bg-accent-blue/60";
  if (cell.dayType === "rest") return "bg-text-muted";
  if (cell.isRest) return "bg-text-dim/50";
  if (cell.reason) return "bg-accent-orange/85";
  if (cell.suggestedType === "lift") return "bg-accent-green/35";
  if (cell.suggestedType === "cardio") return "bg-accent-blue/40";
  if (cell.suggestedType === "recovery") return "bg-accent-blue/25";
  if (cell.suggestedType === "rest") return "bg-white/15";
  return null;
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-3 px-1">
      <h2 className="section-label">{children}</h2>
      {action}
    </div>
  );
}

/** Drops the "Day N — " prefix so titles read as the focus ("Chest, Shoulders, Triceps"). */
function formatSessionTitle(name: string): string {
  return (name.includes("—") ? name.split("—").pop()?.trim() : name) || name;
}

function formatElapsed(isoStart: string): string {
  const start = new Date(isoStart).getTime();
  const now = Date.now();
  const mins = Math.floor((now - start) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Home() {
  const navigate = useNavigate();
  const history = useWorkoutStore((s) => s.history);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const logCardioSession = useWorkoutStore((s) => s.logCardioSession);
  const deleteHistoryEntry = useWorkoutStore((s) => s.deleteHistoryEntry);
  const updateWorkoutDate = useWorkoutStore((s) => s.updateWorkoutDate);
  const program = getProgram("heavy-duty-complete")!;
  const [dataExpanded, setDataExpanded] = useState(false);
  const [showAlternateWorkouts, setShowAlternateWorkouts] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [selectedCalendarCell, setSelectedCalendarCell] = useState<CalendarCell | null>(null);
  const [calendarDateDraft, setCalendarDateDraft] = useState("");
  const [calendarActionError, setCalendarActionError] = useState<string | null>(null);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [showCalendarLegend, setShowCalendarLegend] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const recoveryStatuses = useMemo(() => getMuscleRecoveryStatus(history), [history]);
  const todayDateKey = formatDateKey(new Date());
  const todayEntries = useMemo(
    () => history.filter((workout) => getIsoDateKey(workout.date) === todayDateKey),
    [history, todayDateKey],
  );
  const suggestedStartDateKey = todayEntries.length > 0 ? addDaysToDateKey(todayDateKey, 1) : todayDateKey;
  const suggested = useMemo(
    () => getUpcomingOpenRollingDays(program.days, history, 1, suggestedStartDateKey)[0] ?? null,
    [program.days, history, suggestedStartDateKey],
  );
  const suggestedSmart = useMemo(
    () =>
      suggested
        ? getSmartProgramDaySuggestion(
            suggested.day,
            program.days,
            recoveryStatuses,
            daysBetweenDateKeys(suggested.dateKey, todayDateKey) <= 2,
          )
        : null,
    [program.days, recoveryStatuses, suggested, todayDateKey],
  );

  const streak = useMemo(() => {
    if (history.length === 0) return 0;
    let count = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const check = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayKey = formatDateKey(check);
      const hasWorkout = history.some((w) => getIsoDateKey(w.date) === dayKey);
      if (hasWorkout) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  }, [history]);

  const isCurrentMonth = calendarMonthOffset === 0;

  const { monthSessionCount, monthLabel, calendarDays } = useMemo(() => {
    const now = new Date();
    const viewDate = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Monday-based offset (0=Mon, 6=Sun)
    const startDow = (firstDay.getDay() + 6) % 7;

    const entriesByDate = new Map<string, WorkoutEntry[]>();
    let sessions = 0;
    for (const w of history) {
      const d = new Date(w.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const dateKey = getIsoDateKey(w.date);
        entriesByDate.set(dateKey, [...(entriesByDate.get(dateKey) ?? []), w]);
        sessions++;
      }
    }

    const days: CalendarCell[] = [];
    let futureSuggestionOffset = 0;
    for (let i = 0; i < startDow; i++) {
      days.push({ day: 0, dayType: null, isToday: false, isRest: false, isFuture: false, suggestedType: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateKey = formatDateKey(dateObj);
      const entries = entriesByDate.get(dateKey) ?? [];
      const liftEntry = entries.find((entry) => (entry.dayType ?? "lift") === "lift");
      const primaryEntry = liftEntry ?? entries[0];
      const dayType = primaryEntry ? (primaryEntry.dayType ?? "lift") : null;
      const entryKind: CalendarEntryKind = entries.length === 0 ? "empty" : liftEntry ? "lift" : "nonLift";
      const isFuture = dateKey > todayDateKey;
      const isFutureOrUnworkedToday = entries.length === 0 && dateKey >= todayDateKey;
      const leadDays = daysBetweenDateKeys(dateKey, todayDateKey);

      let suggestedType: DayType | null = null;
      let reason: string | undefined;
      let suggestion: string | undefined;

      if (isFutureOrUnworkedToday) {
        const plannedDay = getRollingDayAtOffset(program.days, history, futureSuggestionOffset, todayDateKey);
        if (plannedDay) {
          const smart = getSmartProgramDaySuggestion(
            plannedDay,
            program.days,
            recoveryStatuses,
            leadDays <= 2,
          );
          suggestedType = smart.type;
          reason = smart.reason;
          suggestion = smart.suggestion;
        }
        futureSuggestionOffset++;
      }

      days.push({
        day: d,
        dateKey,
        dayType,
        isToday: dateKey === todayDateKey,
        isRest: false,
        isFuture,
        suggestedType,
        reason,
        suggestion,
        entryKind,
        workout: primaryEntry,
      });
    }

    const label = viewDate.toLocaleDateString("en-US", { month: "long", year: calendarMonthOffset === 0 ? undefined : "numeric" });

    return { monthSessionCount: sessions, monthLabel: label, calendarDays: days };
  }, [history, program.days, recoveryStatuses, todayDateKey, calendarMonthOffset]);

  const lastSession = history.find((workout) => getIsoDateKey(workout.date) <= todayDateKey) ?? null;
  const suggestedMeta = suggested ? getLastDoneMeta(suggested.day, history) : null;
  const suggestedDaysSince = suggested ? daysSinceLastSession(suggested.day.id, history) : null;
  const trainedRecovery = recoveryStatuses.filter((status) => status.status !== "never");

  const handleExportJSON = () => {
    const workoutState = useWorkoutStore.getState();
    const exState = useExerciseStore.getState();
    const stState = useSettingsStore.getState();
    exportJSON({
      history: workoutState.history,
      activeWorkout: workoutState.activeWorkout,
      lastCompletedWorkout: workoutState.lastCompletedWorkout,
    }, {
      customExercises: exState.customExercises,
      nameOverrides: exState.nameOverrides,
      removedIds: exState.removedIds,
      weightMode: exState.weightMode,
      equipmentOverride: exState.equipmentOverride,
    }, {
      activeProgram: stState.activeProgram,
      restTimerSeconds: stState.restTimerSeconds,
      autoStartTimer: stState.autoStartTimer,
      restTimerSound: stState.restTimerSound,
      gymEquipment: stState.gymEquipment,
      customGymEquipment: stState.customGymEquipment,
    });
  };

  const handleExportCSV = () => exportCSV(history);

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        const parsed = validateImport(json);
        if (!parsed) {
          setImportMsg("Invalid backup file.");
          return;
        }
        const workoutStore = useWorkoutStore.getState();
        const exerciseStore = useExerciseStore.getState();
        const settingsStore = useSettingsStore.getState();

        workoutStore.clearAll();
        exerciseStore.clearAll();
        settingsStore.clearAll();

        workoutStore.restoreState(parsed.backup.workout);
        exerciseStore.restoreState(parsed.backup.exercises);
        settingsStore.restoreState(parsed.backup.settings);

        setImportMsg(
          parsed.sourceVersion === 1
            ? "Legacy backup restored. Missing newer settings were reset to defaults."
            : "Backup restored. Current local data was replaced.",
        );
      } catch {
        setImportMsg("Failed to parse file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const isDoneToday = todayEntries.length > 0;
  const todayPlannedDay = !isDoneToday ? getRollingDayAtOffset(program.days, history, 0) : null;
  const isRestOrRecoveryDay = !!todayPlannedDay && (todayPlannedDay.type === "rest" || todayPlannedDay.type === "recovery");
  const daysSinceActivity = getDaysSinceLastActivity(history);
  const showRestSuggestion = (isRestOrRecoveryDay && !isDoneToday) || daysSinceActivity >= 2;
  const restSuggestion = getRestDaySuggestion(daysSinceActivity);
  const nudgeDotClass =
    restSuggestion.type === "light-cardio"
      ? "bg-accent-orange"
      : restSuggestion.type === "active-recovery"
        ? "bg-accent-blue"
        : "bg-accent-green";
  const lastSessionTitle = lastSession ? formatSessionTitle(lastSession.day) : null;
  const activeExerciseCount = activeWorkout
    ? activeWorkout.exercises.filter((exercise) => !exercise.skipped).length
    : 0;
  const importMessageTone = importMsg?.includes("restored") ? "text-accent-green" : "text-accent-orange";
  const filteredOptions = useMemo(
    () => QUICK_OPTIONS.filter((opt) => !suggested || opt.dayId !== suggested.day.id),
    [suggested],
  );
  const shortcutOptions = useMemo(
    () => filteredOptions.filter((option) => option.type !== "lift"),
    [filteredOptions],
  );
  const alternateLiftOptions = useMemo(
    () => filteredOptions.filter((option) => option.type === "lift"),
    [filteredOptions],
  );
  const allLiftOptions = useMemo(
    () => QUICK_OPTIONS.filter((option) => option.type === "lift"),
    [],
  );
  const visibleLiftOptions = isDoneToday ? allLiftOptions : alternateLiftOptions;
  const selectedCalendarLabel = selectedCalendarCell?.dateKey
    ? formatDayDate(createSessionIso(selectedCalendarCell.dateKey))
    : "";
  const prefetchButtonProps = (path: string) => ({
    onMouseEnter: () => prefetchRoute(path),
    onFocus: () => prefetchRoute(path),
    onTouchStart: () => prefetchRoute(path),
  });
  const getOptionPrefetchPath = (option: QuickOption) => {
    if (option.type === "lift") return `/workout/${option.dayId}`;
    if (option.type === "open") return "/workout/open";
    return null;
  };

  useEffect(() => {
    if (activeWorkout) {
      prefetchRoute(`/workout/${activeWorkout.dayId}`);
      return;
    }

    if (!isDoneToday && suggested) {
      prefetchRoute(`/workout/${suggested.day.id}`);
    }
  }, [activeWorkout, isDoneToday, suggested]);

  const closeCalendarActions = () => {
    setSelectedCalendarCell(null);
    setCalendarDateDraft("");
    setCalendarActionError(null);
  };

  const openCalendarActions = (cell: CalendarCell) => {
    if (cell.day === 0 || !cell.dateKey) return;
    setSelectedCalendarCell(cell);
    setCalendarDateDraft(cell.dateKey);
    setCalendarActionError(null);
  };

  const logManualActivity = (type: "cardio" | "recovery" | "rest", dateKey: string) => {
    const config = MANUAL_ACTIVITY[type];
    return logCardioSession(config.dayId, config.dayName, program.name, type, undefined, dateKey);
  };

  const handleOptionTap = (option: QuickOption) => {
    if (activeWorkout) return;
    if (option.type === "lift") {
      navigate(`/workout/${option.dayId}`);
    } else if (option.type === "open") {
      navigate("/workout/open");
    } else if (isDoneToday) {
      return;
    } else {
      if (!logManualActivity(option.type, todayDateKey)) {
        setCalendarActionError("That day already has a logged session.");
      }
    }
  };

  const handleCalendarActivity = (type: "cardio" | "rest") => {
    if (!selectedCalendarCell?.dateKey || activeWorkout) return;
    if (!logManualActivity(type, selectedCalendarCell.dateKey)) {
      setCalendarActionError("That day already has a logged session.");
      return;
    }
    closeCalendarActions();
  };

  const handleUndoCalendarEntry = () => {
    if (!selectedCalendarCell?.workout) return;
    deleteHistoryEntry(selectedCalendarCell.workout.id);
    closeCalendarActions();
  };

  const handleLiftDateChange = () => {
    if (!selectedCalendarCell?.workout || !selectedCalendarCell.dateKey) return;
    if (!calendarDateDraft) {
      setCalendarActionError("Pick a date.");
      return;
    }
    if (calendarDateDraft === selectedCalendarCell.dateKey) {
      closeCalendarActions();
      return;
    }
    const hasWorkoutOnTargetDate = history.some(
      (workout) =>
        workout.id !== selectedCalendarCell.workout?.id && getIsoDateKey(workout.date) === calendarDateDraft,
    );
    if (hasWorkoutOnTargetDate) {
      setCalendarActionError("Pick an empty date.");
      return;
    }
    if (!updateWorkoutDate(selectedCalendarCell.workout.id, calendarDateDraft)) {
      setCalendarActionError("Pick an empty date.");
      return;
    }
    closeCalendarActions();
  };

  return (
    <PageLayout className="flex flex-col gap-7">
      <header className="animate-fade-up px-1 pt-2">
        <p className="text-[13px] font-medium text-text-muted">{dateStr}</p>
        <h1 className="page-title mt-1">Today</h1>
      </header>

      <section className="flex flex-col gap-5 animate-fade-up" style={{ animationDelay: "40ms" }}>
        {activeWorkout && (
          <button
            onClick={() => navigate(`/workout/${activeWorkout.dayId}`)}
            {...prefetchButtonProps(`/workout/${activeWorkout.dayId}`)}
            className="hero-surface flex w-full flex-col gap-5 rounded-[1.25rem] p-5 text-left"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-red opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-red" />
                </span>
                <span className="section-label text-text-secondary">In progress</span>
              </div>
              <h2 className="mt-2 text-[1.5rem] font-semibold leading-tight tracking-tight text-text-primary">
                {formatSessionTitle(activeWorkout.dayName)}
              </h2>
              <p className="mt-1 text-[13px] text-text-muted">
                Started {formatElapsed(activeWorkout.startedAt)} · {activeExerciseCount}{" "}
                {activeExerciseCount === 1 ? "exercise" : "exercises"}
              </p>
            </div>
            <span className="btn-primary w-full text-[15px]">Resume workout</span>
          </button>
        )}

        {!activeWorkout && isDoneToday && todayEntries.length > 0 && (
          <div className="surface-card rounded-[1.25rem] p-5">
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="h-4 w-4 shrink-0 text-accent-green"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 12.5l2.5 2.5 4.5-5" />
              </svg>
              <span className="section-label">Done for today</span>
            </div>
            <h2 className="mt-2 text-[1.5rem] font-semibold leading-tight tracking-tight text-text-primary">
              {formatSessionTitle(todayEntries[0].day)}
            </h2>
            <p className="mt-1 text-[13px] text-text-muted">Undo or move it from the calendar below.</p>
          </div>
        )}

        {!activeWorkout && !isDoneToday && suggested && (
          <div className="hero-surface rounded-[1.25rem] p-5">
            <div className="flex items-center gap-2">
              <span className="section-label">Suggested</span>
              {suggested.day.type === "lift" && suggestedDaysSince !== null && suggestedDaysSince >= 3 && (
                <span className="rounded-full bg-accent-orange/12 px-2 py-0.5 text-[12px] font-medium leading-tight text-accent-orange">
                  {suggestedDaysSince}d overdue
                </span>
              )}
            </div>
            <h2 className="mt-2 text-[1.5rem] font-semibold leading-tight tracking-tight text-text-primary">
              {suggested.day.focus}
            </h2>
            <p className="mt-1 text-[13px] text-text-muted">
              {getPlannedDayMetric(suggested.day)}
              {suggestedMeta && <> · {getLastDoneText(suggestedMeta)}</>}
            </p>

            {suggestedSmart?.reason && suggestedSmart.suggestion && (
              <div className="mt-4 flex items-start gap-2.5">
                <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-orange" aria-hidden />
                <p className="text-[13px] leading-relaxed text-text-secondary">
                  {suggestedSmart.reason}. {suggestedSmart.suggestion}.
                </p>
              </div>
            )}

            <button
              onClick={() => navigate(`/workout/${suggested.day.id}`)}
              {...prefetchButtonProps(`/workout/${suggested.day.id}`)}
              className="btn-primary mt-5 w-full text-[15px]"
            >
              {getPlannedDayActionLabel(suggested.day)}
            </button>
          </div>
        )}

        {!activeWorkout && !isDoneToday && shortcutOptions.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <SectionLabel>Quick log</SectionLabel>
            <div className="scrollbar-hide -mx-[1.125rem] flex gap-2 overflow-x-auto px-[1.125rem]">
              {shortcutOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleOptionTap(option)}
                  {...(getOptionPrefetchPath(option) ? prefetchButtonProps(getOptionPrefetchPath(option)!) : {})}
                  className="chip !min-h-11 shrink-0 !px-3.5 !text-[14px] font-medium text-text-primary active:bg-fill-strong"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!activeWorkout && visibleLiftOptions.length > 0 && (
          <div className="list-group">
            <button
              type="button"
              onClick={() => setShowAlternateWorkouts((value) => !value)}
              aria-expanded={showAlternateWorkouts}
              className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left active:bg-fill"
            >
              <span className="text-text-muted [&>svg]:h-[1.125rem] [&>svg]:w-[1.125rem]">{ACTIVITY_ICONS.lift}</span>
              <span className="flex-1 text-[15px] text-text-primary">
                {isDoneToday ? "Start a lift workout" : "Other lift days"}
              </span>
              <ChevronIcon
                direction="down"
                className={`text-text-dim transition-transform ${showAlternateWorkouts ? "rotate-180" : ""}`}
              />
            </button>

            {showAlternateWorkouts &&
              visibleLiftOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleOptionTap(option)}
                  {...prefetchButtonProps(`/workout/${option.dayId}`)}
                  className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left animate-fade-in active:bg-fill"
                >
                  <span className="w-[1.125rem] shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[15px] text-text-primary">{option.label}</span>
                  <ChevronIcon className="text-text-dim" />
                </button>
              ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <SectionLabel
          action={
            <button
              type="button"
              onClick={() => navigate("/progress", { state: { tab: "schedule" } })}
              {...prefetchButtonProps("/progress")}
              className="btn-tertiary -my-2.5 -mr-2 gap-1 px-2 text-[13px]"
            >
              Schedule
              <ChevronIcon className="h-3.5 w-3.5" />
            </button>
          }
        >
          Calendar
        </SectionLabel>

        <div className="surface-card rounded-[1.25rem] p-4">
          <div className="-mt-1.5 flex items-center justify-between gap-3 pl-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <h3 className="text-[15px] font-semibold text-text-primary">{monthLabel}</h3>
              <span className="text-[13px] tabular-nums text-text-muted">{monthSessionCount} logged</span>
            </div>
            <div className="-mr-1.5 flex items-center gap-0">
              <button
                type="button"
                onClick={() => setCalendarMonthOffset((o) => o - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-text-secondary active:bg-fill-strong"
                aria-label="Previous month"
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarMonthOffset((o) => o + 1)}
                disabled={isCurrentMonth}
                className="flex h-11 w-11 items-center justify-center rounded-full text-text-secondary active:bg-fill-strong"
                aria-label="Next month"
              >
                <ChevronIcon />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7">
            {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => (
              <div key={`${label}-${index}`} className="flex h-7 items-center justify-center">
                <span className="text-[11px] font-medium text-text-muted">{label}</span>
              </div>
            ))}

            {calendarDays.map((cell, index) => {
              const dotClass = cell.day === 0 ? null : getCalendarDotClass(cell);
              return (
                <div key={`${cell.day}-${index}`} className="flex items-center justify-center">
                  {cell.day === 0 ? (
                    <div className="h-12 w-10" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => openCalendarActions(cell)}
                      aria-current={cell.isToday ? "date" : undefined}
                      className="flex h-12 w-full flex-col items-center justify-center gap-1 rounded-[0.875rem] active:bg-fill"
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] tabular-nums ${getCalendarNumberClass(cell)}`}
                      >
                        {cell.day}
                      </span>
                      <span className={`h-1 w-1 rounded-full ${dotClass ?? "bg-transparent"}`} aria-hidden />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="-mb-1.5 mt-2 flex items-center justify-between gap-3 pl-1">
            <p className="text-[12px] text-text-muted">Tap a date to log, undo, or move.</p>
            <button
              type="button"
              onClick={() => setShowCalendarLegend((value) => !value)}
              aria-expanded={showCalendarLegend}
              className="btn-tertiary -mr-1 shrink-0 px-3 text-[13px]"
            >
              {showCalendarLegend ? "Hide legend" : "Legend"}
            </button>
          </div>

          {showCalendarLegend && (
            <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 border-t border-separator px-1 pt-3 text-[12px] text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                Lift
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-blue" />
                Cardio
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-blue/60" />
                Recovery
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-text-muted" />
                Rest
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-green/35" />
                Planned
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-orange/85" />
                Suggested change
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="animate-fade-up" style={{ animationDelay: "120ms" }}>
        <div className="surface-card grid grid-cols-[1fr_1fr_1.4fr] divide-x divide-separator rounded-[1.25rem] py-4">
          <div className="min-w-0 px-4">
            <p className="stat-value text-[1.5rem] text-text-primary">{streak}</p>
            <p className="mt-1.5 text-[12px] text-text-muted">Day streak</p>
          </div>
          <div className="min-w-0 px-4">
            <p className="stat-value text-[1.5rem] text-text-primary">{history.length}</p>
            <p className="mt-1.5 text-[12px] text-text-muted">Workouts</p>
          </div>
          <div className="min-w-0 px-4">
            <p className="stat-value truncate text-[1.5rem] text-text-primary">
              {lastSession ? formatRelativeDateShort(lastSession.date) : "—"}
            </p>
            <p className="mt-1.5 text-[12px] leading-snug break-words text-text-muted">
              {lastSessionTitle ?? "No sessions yet"}
            </p>
            {lastSession && (
              <p className="mt-0.5 text-[12px] leading-snug tabular-nums text-text-muted">
                {formatDayDate(lastSession.date)}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2.5 animate-fade-up" style={{ animationDelay: "160ms" }}>
        <SectionLabel
          action={
            trainedRecovery.length > 0 ? (
              <span className="flex items-center gap-3 text-[12px] text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-orange" />
                  Recovering
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                  Ready
                </span>
              </span>
            ) : undefined
          }
        >
          Muscle recovery
        </SectionLabel>

        {trainedRecovery.length > 0 ? (
          <div className="flex flex-wrap gap-2" aria-label={`${trainedRecovery.length} groups`}>
            {trainedRecovery.map((status) => (
              <div
                key={status.group}
                className="inline-flex min-h-8 items-center gap-2 rounded-full bg-fill px-3 text-[13px]"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${status.status === "recovering" ? "bg-accent-orange" : "bg-accent-green"}`}
                />
                <span className="text-text-primary">{status.group}</span>
                <span className="tabular-nums text-text-muted">
                  {status.daysSinceLastTrained === 0 ? "today" : `${status.daysSinceLastTrained}d`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-1 text-[13px] leading-relaxed text-text-muted">
            Recovery tracking appears after your first logged lift workout.
          </p>
        )}

        {showRestSuggestion && (
          <div className="surface-card mt-2.5 rounded-[1.25rem] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[15px] font-semibold text-text-primary">
                <span className={`h-2 w-2 rounded-full ${nudgeDotClass}`} aria-hidden />
                {restSuggestion.type === "full-rest" ? "Rest day" : "Stay active"}
              </span>
              <span className="text-[12px] tabular-nums text-text-muted">
                {daysSinceActivity === 999 ? "No recent activity" : `${daysSinceActivity}d since last session`}
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">{restSuggestion.message}</p>

            {restSuggestion.activities.length > 0 && restSuggestion.type !== "full-rest" && (
              <div className="mt-3 divide-y divide-separator border-t border-separator">
                {restSuggestion.activities.map((activity, index) => (
                  <div key={`${activity.name}-${index}`} className="py-3 last:pb-0">
                    <p className="text-[14px] text-text-primary">{activity.name}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-text-muted">{activity.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2.5 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <SectionLabel action={<span className="text-[12px] tabular-nums text-text-muted">{history.length} workouts on this device</span>}>
          Data
        </SectionLabel>

        <div className="list-group">
          <button
            onClick={handleExportJSON}
            className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left active:bg-fill"
          >
            <svg {...iconProps} className="h-[1.125rem] w-[1.125rem] shrink-0 text-text-muted">
              <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14" />
            </svg>
            <span className="flex-1 text-[15px] text-text-primary">Export backup</span>
            <span className="text-[13px] text-text-muted">JSON</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left active:bg-fill"
          >
            <svg {...iconProps} className="h-[1.125rem] w-[1.125rem] shrink-0 text-text-muted">
              <path d="M4 5h16v14H4zM4 10h16M4 14.5h16M10 10v9" />
            </svg>
            <span className="flex-1 text-[15px] text-text-primary">Export history</span>
            <span className="text-[13px] text-text-muted">CSV</span>
          </button>
          <button
            onClick={() => setDataExpanded((value) => !value)}
            aria-expanded={dataExpanded}
            className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 text-left active:bg-fill"
          >
            <svg {...iconProps} className="h-[1.125rem] w-[1.125rem] shrink-0 text-text-muted">
              <path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7M4 4v4.7h4.7" />
            </svg>
            <span className="flex-1 text-[15px] text-text-primary">Restore from backup</span>
            <ChevronIcon
              direction="down"
              className={`text-text-dim transition-transform ${dataExpanded ? "rotate-180" : ""}`}
            />
          </button>

          {dataExpanded && (
            <div className="flex flex-col gap-3 px-4 py-4 animate-fade-in">
              <p className="text-[13px] leading-relaxed text-text-secondary">
                Restoring a JSON backup replaces your current history, settings, and any in-progress workout on this
                device.
              </p>
              <button onClick={() => fileRef.current?.click()} className="btn-danger w-full text-[14px]">
                Choose backup file
              </button>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              {importMsg && <p className={`text-center text-[13px] ${importMessageTone}`}>{importMsg}</p>}
            </div>
          )}
        </div>
      </section>

      {selectedCalendarCell && (
        <div
          className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 px-3 pt-20 backdrop-blur-sm animate-fade-in"
          onClick={closeCalendarActions}
        >
          <div
            className="mx-auto w-full max-w-[28rem] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] animate-slide-up"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-surface rounded-[1.5rem] p-5" role="dialog" aria-modal="true" aria-label={selectedCalendarLabel}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="section-label">
                    {selectedCalendarCell.entryKind === "empty"
                      ? "Empty date"
                      : selectedCalendarCell.entryKind === "lift"
                        ? "Lift logged"
                        : "Activity logged"}
                  </p>
                  <h3 className="section-title mt-1">{selectedCalendarLabel}</h3>
                  {selectedCalendarCell.workout && (
                    <div className="mt-3">
                      <p className="text-[15px] font-medium text-text-primary">
                        {formatSessionTitle(selectedCalendarCell.workout.day)}
                      </p>
                      {selectedCalendarCell.workout.activityName && (
                        <p className="mt-0.5 text-[13px] text-text-secondary">
                          {selectedCalendarCell.workout.activityName}
                        </p>
                      )}
                    </div>
                  )}
                  <p className={`${selectedCalendarCell.workout ? "mt-3" : "mt-1"} text-[13px] leading-relaxed text-text-muted`}>
                    {selectedCalendarCell.entryKind === "empty"
                      ? "Nothing is logged here yet."
                      : selectedCalendarCell.entryKind === "lift"
                        ? "Choose an empty date to move this workout."
                        : "Undo this cardio, recovery, or rest log if needed."}
                  </p>
                </div>
                <button onClick={closeCalendarActions} className="btn-tertiary -mr-2 -mt-2 shrink-0 px-3 text-[14px]">
                  Close
                </button>
              </div>

              {selectedCalendarCell.entryKind === "empty" && (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCalendarActivity("cardio")}
                    disabled={!!activeWorkout}
                    className="btn-secondary w-full px-4 text-[14px]"
                  >
                    {ACTIVITY_ICONS.cardio}
                    Log cardio
                  </button>
                  <button
                    onClick={() => handleCalendarActivity("rest")}
                    disabled={!!activeWorkout}
                    className="btn-secondary w-full px-4 text-[14px]"
                  >
                    {ACTIVITY_ICONS.rest}
                    Log rest
                  </button>
                </div>
              )}

              {selectedCalendarCell.entryKind === "nonLift" && (
                <button onClick={handleUndoCalendarEntry} className="btn-danger mt-5 w-full text-[15px]">
                  Undo this log
                </button>
              )}

              {selectedCalendarCell.entryKind === "lift" && (
                <div className="mt-5 flex flex-col gap-2">
                  <label className="section-label px-1" htmlFor="calendar-date-move">
                    New date
                  </label>
                  <input
                    id="calendar-date-move"
                    type="date"
                    value={calendarDateDraft}
                    max={todayDateKey}
                    onChange={(event) => {
                      setCalendarDateDraft(event.target.value);
                      setCalendarActionError(null);
                    }}
                    className="input-shell input-focus min-h-12 w-full px-4 text-[15px] text-text-primary outline-none"
                  />
                  <button onClick={handleLiftDateChange} className="btn-primary mt-2 w-full text-[15px]">
                    Move workout
                  </button>
                </div>
              )}

              {activeWorkout && selectedCalendarCell.entryKind === "empty" && (
                <p className="mt-3 text-[13px] leading-relaxed text-text-muted">
                  Finish or cancel the workout in progress before logging another date.
                </p>
              )}

              {calendarActionError && (
                <p className="mt-3 text-[13px] font-medium text-accent-orange">{calendarActionError}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
