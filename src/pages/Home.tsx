import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getProgram } from "../data/programs";
import { getRandomQuote } from "../data/quotes";
import { exportJSON, exportCSV, validateImport } from "../lib/export";
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
type LastDoneTone = "ready" | "warning" | "muted" | "quiet";
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

const ACTIVITY_ICONS: Record<string, ReactNode> = {
  cardio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  recovery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" />
      <path d="M9 9h.01M15 9h.01" strokeLinecap="round" />
    </svg>
  ),
  rest: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M5 14.5c1.4 3 4.2 4.5 7 4.5 4.4 0 8-3.6 8-8 0-2.8-1.5-5.3-3.8-6.8" strokeLinecap="round" />
      <path d="M8 5.5c.8-1.5 2.4-2.5 4.2-2.5" strokeLinecap="round" />
      <path d="M4 5l1.8 2.7L9 6.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  lift: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M6.5 6.5v11M17.5 6.5v11M6.5 12h11M4 8v8M20 8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  open: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

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
  accentColor: string;
  icon: ReactNode;
}

const QUICK_OPTIONS: QuickOption[] = [
  { key: "hd-monday", label: "Push", type: "lift", dayId: "hd-monday", accentColor: "#FF453A", icon: ACTIVITY_ICONS.lift },
  { key: "hd-wednesday", label: "Pull", type: "lift", dayId: "hd-wednesday", accentColor: "#0A84FF", icon: ACTIVITY_ICONS.lift },
  { key: "hd-friday", label: "Legs & Abs", type: "lift", dayId: "hd-friday", accentColor: "#FF9F0A", icon: ACTIVITY_ICONS.lift },
  { key: "manual-cardio", label: "Cardio", type: "cardio", dayId: "manual-cardio", accentColor: "#0A84FF", icon: ACTIVITY_ICONS.cardio },
  { key: "manual-recovery", label: "Recovery", type: "recovery", dayId: "manual-recovery", accentColor: "#0A84FF", icon: ACTIVITY_ICONS.recovery },
  { key: "manual-rest", label: "Rest", type: "rest", dayId: "manual-rest", accentColor: "#30D158", icon: ACTIVITY_ICONS.rest },
  { key: "open", label: "Open Workout", type: "open", dayId: "open", accentColor: "#FFD60A", icon: ACTIVITY_ICONS.open },
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

function getLastDoneToneClass(tone: LastDoneTone) {
  switch (tone) {
    case "ready":
      return "border-accent-green/20 bg-accent-green/10 text-accent-green";
    case "warning":
      return "border-accent-orange/20 bg-accent-orange/10 text-accent-orange";
    case "muted":
      return "border-white/[0.08] bg-white/[0.04] text-text-secondary";
    default:
      return "border-white/[0.06] bg-white/[0.03] text-text-muted";
  }
}

function getPlannedDaySummary(day: ProgramDay, hasHistory: boolean) {
  if (day.type === "lift") {
    return hasHistory
      ? "The cycle now advances from your history, so this is the next lifting day on deck."
      : "A clean place to start, with the seeded Mentzer warm-up and working set already ready.";
  }
  if (day.type === "cardio") {
    return "This cardio block is next in your cycle. Open it to log the session and keep the rotation moving.";
  }
  if (day.type === "recovery") {
    return "Your next planned day is active recovery. Open it when you want the recovery checklist and quick log flow.";
  }
  return "Your cycle lands on a full rest day next. Open it if you want the dedicated rest-day view and logging option.";
}

function getPlannedDayMetric(day: ProgramDay) {
  if (day.type === "lift") return `${day.exercises.length} exercises`;
  if (day.duration) return day.duration;
  return day.type === "rest" ? "Full rest" : day.focus;
}

function getPlannedDayActionLabel(day: ProgramDay) {
  if (day.type === "lift") return "Start Workout";
  if (day.type === "cardio") return "Open Cardio Day";
  if (day.type === "recovery") return "Open Recovery Day";
  return "Open Rest Day";
}

function getCalendarCellClass(cell: CalendarCell) {
  if (cell.dayType === "lift") return "bg-accent-green text-white shadow-[0_10px_24px_rgba(48,209,88,0.18)]";
  if (cell.dayType === "cardio") return "bg-accent-blue text-white shadow-[0_10px_24px_rgba(10,132,255,0.18)]";
  if (cell.dayType === "recovery") return "bg-accent-blue/65 text-white";
  if (cell.dayType === "rest") return "bg-accent-green/45 text-white";
  if (cell.isToday && cell.reason) return "bg-white/[0.04] text-text-primary ring-2 ring-accent-orange/60";
  if (cell.isToday && cell.suggestedType === "lift") return "bg-white/[0.04] text-text-primary ring-2 ring-accent-green/55";
  if (cell.isToday && cell.suggestedType === "cardio") return "bg-white/[0.04] text-text-primary ring-2 ring-accent-blue/55";
  if (cell.isToday && cell.suggestedType === "recovery") return "bg-white/[0.04] text-text-primary ring-2 ring-accent-blue/35";
  if (cell.isToday && cell.suggestedType === "rest") return "bg-white/[0.04] text-text-primary ring-2 ring-white/18";
  if (cell.isToday) return "bg-white/[0.03] text-text-primary ring-1 ring-white/15";
  if (cell.reason) return "bg-transparent text-accent-orange/80 ring-1 ring-accent-orange/45";
  if (cell.suggestedType === "lift") return "bg-transparent text-accent-green/75 ring-1 ring-accent-green/45";
  if (cell.suggestedType === "cardio") return "bg-transparent text-accent-blue/75 ring-1 ring-accent-blue/45";
  if (cell.suggestedType === "recovery") return "bg-transparent text-accent-blue/55 ring-1 ring-accent-blue/25";
  if (cell.suggestedType === "rest") return "bg-transparent text-text-dim ring-1 ring-white/12";
  return "text-text-dim";
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="section-label">{eyebrow}</p>
        <h2 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-text-primary">{title}</h2>
        <p className="mt-1 max-w-[24rem] text-sm leading-relaxed text-text-muted">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accentClass,
}: {
  label: string;
  value: string | number;
  hint: string;
  accentClass: string;
}) {
  return (
    <div className="surface-card-muted rounded-[1.35rem] p-4">
      <p className="section-label">{label}</p>
      <div className="mt-3 flex items-end gap-2">
        <span className={`font-[var(--font-display)] text-[2.6rem] leading-none tracking-[0.08em] ${accentClass}`}>
          {value}
        </span>
      </div>
      <p className="mt-2 text-xs text-text-muted">{hint}</p>
    </div>
  );
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
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [selectedCalendarCell, setSelectedCalendarCell] = useState<CalendarCell | null>(null);
  const [calendarDateDraft, setCalendarDateDraft] = useState("");
  const [calendarActionError, setCalendarActionError] = useState<string | null>(null);
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

  const quote = useMemo(() => getRandomQuote(), []);

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

  const { monthSessionCount, monthLabel, calendarDays } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
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

    const label = now.toLocaleDateString("en-US", { month: "long" });

    return { monthSessionCount: sessions, monthLabel: label, calendarDays: days };
  }, [history, program.days, recoveryStatuses, todayDateKey]);

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
  const nudgeColor =
    restSuggestion.type === "light-cardio"
      ? "#ff9f0a"
      : restSuggestion.type === "active-recovery"
        ? "#0a84ff"
        : "#30d158";
  const lastSessionTitle = lastSession
    ? (lastSession.day.includes("—") ? lastSession.day.split("—").pop()?.trim() : lastSession.day) ?? lastSession.day
    : null;
  const importMessageTone = importMsg?.includes("restored") ? "text-accent-green" : "text-accent-orange";
  const filteredOptions = useMemo(
    () => QUICK_OPTIONS.filter((opt) => !suggested || opt.dayId !== suggested.day.id),
    [suggested],
  );
  const selectedCalendarLabel = selectedCalendarCell?.dateKey
    ? formatDayDate(createSessionIso(selectedCalendarCell.dateKey))
    : "";

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
    if (isDoneToday || activeWorkout) return;
    if (option.type === "lift") {
      navigate(`/workout/${option.dayId}`);
    } else if (option.type === "open") {
      navigate("/workout/open");
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
    <PageLayout className="flex flex-col gap-6">
      <header className="animate-fade-up">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="chip chip-muted w-fit text-[10px] font-semibold tracking-[0.18em] text-text-muted uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-red" />
              Heavy Duty
            </div>
            <h1 className="mt-4 font-[var(--font-display)] text-[2.6rem] leading-none tracking-[0.18em] text-text-primary">
              HEAVY DUTY
            </h1>
            <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-text-muted">
              {activeWorkout
                ? "Your session is still live. Resume it first, then use cardio or rest if you still need to log today."
                : history.length === 0
                  ? "Three clear choices live at the top: start the workout, mark cardio, or mark a rest day."
                  : "Everything important for today lives right here."}
            </p>
          </div>
          <div className="surface-card-muted rounded-[1.15rem] px-3 py-2 text-right">
            <span className="section-label block text-[0.58rem]">Today</span>
            <span className="mt-1 block text-xs font-medium text-text-secondary">{dateStr}</span>
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "40ms" }}>
        <SectionHeading
          eyebrow="Quick Start"
          title={activeWorkout ? "Resume or log today" : "Workout, cardio, or rest"}
          description="The main card follows your rolling cycle, with simple cardio and rest logs still one tap away."
        />

        {activeWorkout && (
          <button
            onClick={() => navigate(`/workout/${activeWorkout.dayId}`)}
            className="surface-card card-glow-green flex flex-col gap-4 rounded-[1.6rem] p-4 text-left"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-accent-green/12 text-accent-green">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="section-label text-accent-green">In Progress</span>
                  <span className="chip chip-muted text-[11px] text-text-secondary">
                    {activeWorkout.exercises.filter((exercise) => !exercise.skipped).length} exercises
                  </span>
                </div>
                <h2 className="mt-2 font-[var(--font-display)] text-[1.9rem] leading-none tracking-[0.08em] text-text-primary">
                  {activeWorkout.dayName}
                </h2>
                <p className="mt-2 text-sm text-text-muted">
                  Started {formatElapsed(activeWorkout.startedAt)}. Your logged sets are still saved.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-[1.2rem] bg-white/[0.05] px-4 py-3">
              <span className="text-sm font-semibold text-text-primary">Resume Workout</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-accent-green">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        )}

        {!activeWorkout && isDoneToday && todayEntries.length > 0 && (
          <div className="surface-card flex flex-col gap-3 rounded-[1.6rem] p-5 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-accent-green/12 text-accent-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <span className="section-label text-accent-green">Done for Today</span>
                <h2 className="mt-2 font-[var(--font-display)] text-[1.9rem] leading-none tracking-[0.08em] text-text-primary">
                  {(todayEntries[0].day.includes("—") ? todayEntries[0].day.split("—").pop()?.trim() : todayEntries[0].day) ?? todayEntries[0].day}
                </h2>
                <p className="mt-2 text-sm text-text-muted">
                  Check the calendar below to undo or adjust.
                </p>
              </div>
            </div>
          </div>
        )}

        {!activeWorkout && !isDoneToday && suggested && (
          <div className="hero-surface card-glow-red flex flex-col gap-4 rounded-[1.8rem] p-5 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="section-label text-accent-red">Suggested</span>
                  {suggested.day.type === "lift" && suggestedDaysSince !== null && suggestedDaysSince >= 3 && (
                    <span className="chip border-accent-orange/20 bg-accent-orange/10 text-[11px] font-semibold text-accent-orange">
                      {suggestedDaysSince}d overdue
                    </span>
                  )}
                </div>
                <h2 className="mt-3 font-[var(--font-display)] text-[2.4rem] leading-[0.92] tracking-[0.08em] text-text-primary">
                  {suggested.day.focus}
                </h2>
                <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-text-secondary">
                  {getPlannedDaySummary(suggested.day, history.length > 0)}
                </p>
              </div>
              <div className="rounded-[1.15rem] bg-black/12 px-3 py-2 text-right">
                <span className="section-label block text-[0.58rem] text-text-secondary/85">Plan</span>
                <span className="mt-1 block text-sm font-semibold text-text-primary">
                  {getPlannedDayMetric(suggested.day)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggested.day.type === "lift" && (
                <span className="chip text-xs text-text-secondary">Mentzer protocol</span>
              )}
              {suggestedMeta && (
                <span className={`chip text-xs ${getLastDoneToneClass(suggestedMeta.tone)}`}>{suggestedMeta.label}</span>
              )}
            </div>
            {suggestedSmart?.reason && suggestedSmart.suggestion && (
              <div className="rounded-[1.2rem] border border-accent-orange/20 bg-accent-orange/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-orange">
                  Recovery Suggestion
                </p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {suggestedSmart.reason}. {suggestedSmart.suggestion}.
                </p>
              </div>
            )}
            <button
              onClick={() => navigate(`/workout/${suggested.day.id}`)}
              className="flex items-center justify-between rounded-[1.2rem] bg-white/[0.06] px-4 py-3"
            >
              <span className="text-sm font-semibold text-white">{getPlannedDayActionLabel(suggested.day)}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-white">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        {!activeWorkout && (
          <>
            <p className="section-label mt-1 text-text-muted">
              {isDoneToday ? "Already logged — options disabled" : "Other Options"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {filteredOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => handleOptionTap(option)}
                  disabled={isDoneToday}
                  className={`surface-card-muted flex flex-col gap-3 rounded-[1.45rem] p-4 text-left transition-opacity ${
                    isDoneToday ? "opacity-45 pointer-events-none" : ""
                  }`}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-[1rem]"
                    style={{ background: `${option.accentColor}15`, color: option.accentColor }}
                  >
                    {option.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{option.label}</h3>
                    <p className="mt-0.5 text-[11px] text-text-muted">
                      {option.type === "lift" ? "Start workout" : option.type === "open" ? "Freeform session" : "Quick log"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "80ms" }}>
        <SectionHeading
          eyebrow="Overview"
          title="Your snapshot"
          description="A quick read on consistency, total logged work, and the most recent session."
        />

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Streak"
            value={streak}
            hint={`${streak === 1 ? "Day" : "Days"} in a row`}
            accentClass="text-accent-orange"
          />
          <StatCard
            label="Workouts"
            value={history.length}
            hint="Logged in total"
            accentClass="text-accent-blue"
          />
        </div>

        <div className="surface-card rounded-[1.55rem] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="section-label">Last Session</p>
              <h3 className="mt-2 text-base font-semibold text-text-primary">
                {lastSessionTitle ?? "No sessions yet"}
              </h3>
              <p className="mt-1 text-sm text-text-muted">
                {lastSession ? formatDayDate(lastSession.date) : "Your first finished workout will show up here."}
              </p>
            </div>
            {lastSession && (
              <span className="chip chip-muted shrink-0 text-[11px] text-text-secondary">
                {formatRelativeDateShort(lastSession.date)}
              </span>
            )}
          </div>

          <div className="mt-4 rounded-[1.2rem] bg-white/[0.04] px-4 py-3">
            {lastSession ? (
              <p className="text-sm leading-relaxed text-text-secondary">
                Jump into History to review the full session, edit it, or filter similar workouts later.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-text-muted">
                Finish any workout and it will appear here automatically with the same edit and history tools.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <SectionHeading
          eyebrow="This Month"
          title="Plan and history in one place"
          description="Filled circles are logged sessions. Rings show the plan, and orange rings mean recovery suggests a change."
          action={
            <div className="surface-card-muted rounded-[1rem] px-3 py-2 text-right">
              <span className="section-label block text-[0.58rem]">Sessions</span>
              <span className="mt-1 block text-lg font-semibold tabular-nums text-text-primary">{monthSessionCount}</span>
            </div>
          }
        />

        <div className="surface-card rounded-[1.6rem] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-text-primary">{monthLabel}</h3>
            <span className="chip chip-muted text-[11px] text-text-secondary">
              {monthSessionCount === 0 ? "No sessions yet" : `${monthSessionCount} logged`}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2">
            {["M", "T", "W", "T", "F", "S", "S"].map((label) => (
              <div key={label} className="flex items-center justify-center">
                <span className="text-[10px] font-semibold text-text-dim">{label}</span>
              </div>
            ))}

            {calendarDays.map((cell, index) => (
              <div key={`${cell.day}-${index}`} className="flex items-center justify-center">
                {cell.day === 0 ? (
                  <div className="h-9 w-9" />
                ) : (
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => openCalendarActions(cell)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${getCalendarCellClass(cell)}`}
                    >
                      {cell.day}
                    </button>
                    {cell.isRest && !cell.dayType && <div className="mt-1 h-1 w-1 rounded-full bg-text-dim/50" />}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip chip-muted text-[11px] text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-accent-green" />
              Lift
            </span>
            <span className="chip chip-muted text-[11px] text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-accent-blue" />
              Cardio
            </span>
            <span className="chip chip-muted text-[11px] text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-accent-blue/65" />
              Recovery
            </span>
            <span className="chip chip-muted text-[11px] text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-accent-green/45" />
              Rest
            </span>
            <span className="chip chip-muted text-[11px] text-text-secondary">
              <span className="h-2 w-2 rounded-full ring-1 ring-accent-green/60" />
              Planned
            </span>
            <span className="chip chip-muted text-[11px] text-text-secondary">
              <span className="h-2 w-2 rounded-full ring-1 ring-accent-orange/60" />
              Suggested Change
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-text-muted">
            Tap an empty date to log cardio or rest. Logged cardio or rest days can be undone here, logged lift days can be moved to the right date, and future rings now advance from your history-based cycle.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "160ms" }}>
        <SectionHeading
          eyebrow="Recovery"
          title="Know what is ready"
          description="See what still needs time, what is ready again, and what to do on lighter days."
        />

        <div className="surface-card rounded-[1.55rem] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="section-label">Muscle Recovery</p>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">
                {trainedRecovery.length > 0
                  ? "Orange is still recovering. Green is ready for another hard session."
                  : "Recovery tracking appears after your first logged lift workout."}
              </p>
            </div>
            {trainedRecovery.length > 0 && (
              <span className="chip chip-muted shrink-0 text-[11px] text-text-secondary">
                {trainedRecovery.length} groups
              </span>
            )}
          </div>

          {trainedRecovery.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {trainedRecovery.map((status) => (
                <div
                  key={status.group}
                  className="chip border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px]"
                >
                  <span className={`h-2 w-2 rounded-full ${status.status === "recovering" ? "bg-accent-orange" : "bg-accent-green"}`} />
                  <span className="font-medium text-text-secondary">{status.group}</span>
                  <span className="tabular-nums text-text-dim">
                    {status.daysSinceLastTrained === 0 ? "today" : `${status.daysSinceLastTrained}d`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.03] px-4 py-4">
              <p className="text-sm leading-relaxed text-text-muted">
                After your first lift is saved, this section will show which muscle groups are still recovering and which are ready again.
              </p>
            </div>
          )}
        </div>

        {showRestSuggestion && (
          <div
            className="surface-card rounded-[1.55rem] p-4"
            style={{
              background: `linear-gradient(145deg, ${nudgeColor}16 0%, rgba(14, 18, 27, 0.96) 48%, rgba(12, 15, 22, 0.96) 100%)`,
              borderColor: `${nudgeColor}40`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem]"
                style={{ background: `${nudgeColor}18`, color: nudgeColor }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="section-label" style={{ color: nudgeColor }}>
                    {restSuggestion.type === "full-rest" ? "Rest Day" : "Stay Active"}
                  </span>
                  <span className="chip bg-white/[0.04] text-[11px] text-text-secondary">
                    {daysSinceActivity === 999 ? "No recent activity" : `${daysSinceActivity}d since last session`}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">{restSuggestion.message}</p>
              </div>
            </div>

            {restSuggestion.activities.length > 0 && restSuggestion.type !== "full-rest" && (
              <div className="mt-4 flex flex-col gap-2">
                {restSuggestion.activities.map((activity, index) => (
                  <div
                    key={`${activity.name}-${index}`}
                    className="rounded-[1.1rem] border border-white/[0.06] bg-black/10 px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-semibold tabular-nums" style={{ color: nudgeColor }}>
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary">{activity.name}</p>
                        <p className="mt-1 text-xs leading-relaxed text-text-muted">{activity.note}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <SectionHeading
          eyebrow="Backup & Export"
          title="Keep your data portable"
          description="Export a full backup, grab CSV, or restore from a saved file without leaving Home."
        />

        <div className="surface-card overflow-hidden rounded-[1.55rem]">
          <button
            onClick={() => setDataExpanded((value) => !value)}
            className="flex w-full items-center justify-between px-4 py-4 text-left"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">Backup & Export</p>
              <p className="mt-1 text-xs text-text-muted">{history.length} workouts stored on this device</p>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`h-4 w-4 text-text-dim transition-transform ${dataExpanded ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {dataExpanded && (
            <div className="border-t border-border px-4 py-4">
              <p className="mb-3 text-sm leading-relaxed text-text-muted">
                JSON now restores the full app state, including your in-progress workout. CSV exports set-level data for spreadsheets.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleExportJSON} className="btn-secondary w-full text-[13px] font-medium">
                  Export JSON
                </button>
                <button onClick={handleExportCSV} className="btn-secondary w-full text-[13px] font-medium">
                  Export CSV
                </button>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-secondary mt-2 w-full border-dashed text-[13px] font-medium"
              >
                Import Backup
              </button>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              {importMsg && <p className={`mt-3 text-center text-sm ${importMessageTone}`}>{importMsg}</p>}
            </div>
          )}
        </div>
      </section>

      <section className="animate-fade-up" style={{ animationDelay: "240ms" }}>
        <div className="surface-card-muted rounded-[1.55rem] p-5">
          <p className="section-label">Mentzer Quote</p>
          <p className="mt-3 text-[0.95rem] leading-7 text-text-secondary">"{quote}"</p>
          <p className="mt-3 text-xs font-medium tracking-[0.16em] text-text-dim uppercase">Mike Mentzer</p>
        </div>
      </section>

      {selectedCalendarCell && (
        <div className="fixed inset-0 z-50 bg-black/70 px-4 pt-20 backdrop-blur-sm" onClick={closeCalendarActions}>
          <div
            className="mx-auto mt-auto max-w-[28rem] pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="surface-card rounded-[1.7rem] p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="section-label">
                    {selectedCalendarCell.entryKind === "empty"
                      ? "Empty Date"
                      : selectedCalendarCell.entryKind === "lift"
                        ? "Lift Logged"
                        : "Cardio Or Rest Logged"}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-text-primary">{selectedCalendarLabel}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">
                    {selectedCalendarCell.entryKind === "empty"
                      ? "Nothing is logged here yet."
                      : selectedCalendarCell.entryKind === "lift"
                        ? "Pick the correct empty date to move this workout."
                        : "Use undo to remove this cardio or rest log from the calendar."}
                  </p>
                </div>
                <button onClick={closeCalendarActions} className="btn-ghost shrink-0 px-3 py-2 text-xs font-semibold">
                  Close
                </button>
              </div>

              {selectedCalendarCell.workout && (
                <div className="mt-4 rounded-[1.2rem] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                  <p className="text-sm font-semibold text-text-primary">{selectedCalendarCell.workout.day}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    {selectedCalendarCell.workout.activityName
                      ? selectedCalendarCell.workout.activityName
                      : selectedCalendarCell.entryKind === "lift"
                        ? "Logged as a lift session."
                        : "Logged without an activity name."}
                  </p>
                </div>
              )}

              {selectedCalendarCell.entryKind === "empty" && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleCalendarActivity("cardio")}
                    disabled={!!activeWorkout}
                    className={`rounded-[1.2rem] px-4 py-4 text-left ${
                      activeWorkout ? "bg-white/[0.04] text-text-dim" : "bg-accent-blue/12 text-accent-blue"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {ACTIVITY_ICONS.cardio}
                      Mark Cardio
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-text-muted">Save a cardio log on this date.</p>
                  </button>
                  <button
                    onClick={() => handleCalendarActivity("rest")}
                    disabled={!!activeWorkout}
                    className={`rounded-[1.2rem] px-4 py-4 text-left ${
                      activeWorkout ? "bg-white/[0.04] text-text-dim" : "bg-accent-green/12 text-accent-green"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {ACTIVITY_ICONS.rest}
                      Mark Rest
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-text-muted">Save a full rest day here.</p>
                  </button>
                </div>
              )}

              {selectedCalendarCell.entryKind === "nonLift" && (
                <button
                  onClick={handleUndoCalendarEntry}
                  className="mt-4 w-full rounded-[1.2rem] bg-accent-orange/14 px-4 py-3 text-sm font-semibold text-accent-orange"
                >
                  Undo This Log
                </button>
              )}

              {selectedCalendarCell.entryKind === "lift" && (
                <div className="mt-4 flex flex-col gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-text-dim" htmlFor="calendar-date-move">
                    New Date
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
                    className="w-full rounded-[1rem] border border-border bg-bg-input px-4 py-3 text-sm text-text-primary outline-none"
                  />
                  <button
                    onClick={handleLiftDateChange}
                    className="w-full rounded-[1.2rem] bg-accent-red px-4 py-3 text-sm font-semibold text-white"
                  >
                    Save New Date
                  </button>
                </div>
              )}

              {activeWorkout && selectedCalendarCell.entryKind === "empty" && (
                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                  Finish or cancel the workout in progress before logging cardio or rest on another date.
                </p>
              )}

              {calendarActionError && (
                <p className="mt-3 text-sm font-medium text-accent-orange">{calendarActionError}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
