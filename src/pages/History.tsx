import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { useWorkoutStore } from "../store/workoutStore";
import { programs } from "../data/programs";
import type { WorkoutEntry, ExerciseEntry } from "../types";
import { formatDayDate, formatMonthYear } from "../lib/dates";

function calcStats(workout: WorkoutEntry) {
  let totalSets = 0;
  let totalVolume = 0;
  let totalExercises = 0;
  for (const ex of workout.exercises) {
    if (ex.skipped) continue;
    totalExercises++;
    totalSets += ex.sets.length;
    for (const s of ex.sets) totalVolume += s.weight * s.reps;
  }
  return { totalExercises, totalSets, totalVolume };
}

function findPrevSession(workout: WorkoutEntry, history: WorkoutEntry[]): WorkoutEntry | null {
  const idx = history.indexOf(workout);
  for (let i = idx + 1; i < history.length; i++) {
    if (history[i].dayId === workout.dayId) return history[i];
  }
  return null;
}

function calcProgress(current: WorkoutEntry, prev: WorkoutEntry | null) {
  if (!prev) return null;
  const curVol = calcStats(current).totalVolume;
  const prevVol = calcStats(prev).totalVolume;
  if (prevVol === 0) return null;
  const delta = curVol - prevVol;
  const pct = (delta / prevVol) * 100;
  return {
    volumePercent: pct,
    type: delta > 0 ? "increase" : delta < 0 ? "decrease" : "same",
  } as const;
}

function formatVolume(vol: number): string {
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(vol >= 10000 ? 0 : 1)}k`;
  return vol.toLocaleString();
}

type MonthGroup = { label: string; workouts: WorkoutEntry[] };

function groupByMonth(workouts: WorkoutEntry[]): MonthGroup[] {
  const groups: Map<string, WorkoutEntry[]> = new Map();
  for (const w of workouts) {
    const key = formatMonthYear(w.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(w);
  }
  return Array.from(groups.entries()).map(([label, workouts]) => ({ label, workouts }));
}

const dayColors: Record<string, string> = {
  "day-1": "#ff453a",
  "day-2": "#ff9f0a",
  "day-3": "#0a84ff",
  "day-4": "#30d158",
  open: "#ffd60a",
};

const dayTypeColors: Record<string, string> = {
  cardio: "#0a84ff",
  recovery: "#0a84ff",
  rest: "#30d158",
};

function getDayColor(workout: WorkoutEntry): string {
  const dayType = workout.dayType ?? "lift";
  if (dayType !== "lift") return dayTypeColors[dayType] || "#ffd60a";
  return dayColors[workout.dayId] || "#ffd60a";
}

function getWorkoutTitle(workout: WorkoutEntry): string {
  return workout.day.includes(" — ") ? workout.day.split(" — ")[1] : workout.day;
}

function getWorkoutTypeLabel(workout: WorkoutEntry): string {
  const dayType = workout.dayType ?? "lift";
  if (dayType === "lift") return workout.dayId === "open" ? "Open" : "Lift";
  return dayType.charAt(0).toUpperCase() + dayType.slice(1);
}

export function History() {
  const navigate = useNavigate();
  const history = useWorkoutStore((s) => s.history);
  const clearWorkouts = useWorkoutStore((s) => s.clearAll);
  const deleteHistoryEntry = useWorkoutStore((s) => s.deleteHistoryEntry);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [exerciseFilter, setExerciseFilter] = useState<string | null>(null);

  const liftingDays = programs[0].days.filter((d) => d.type === "lift");
  const filteredHistory = useMemo(() => {
    let filtered = activeFilter === "all"
      ? history
      : activeFilter === "cardio-all"
        ? history.filter((w) => (w.dayType ?? "lift") !== "lift")
        : history.filter((w) => w.dayId === activeFilter);
    if (exerciseFilter) {
      filtered = filtered.filter((w) => w.exercises.some((e) => e.id === exerciseFilter));
    }
    return filtered;
  }, [history, activeFilter, exerciseFilter]);
  const monthGroups = useMemo(() => groupByMonth(filteredHistory), [filteredHistory]);

  const exerciseNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const workout of history) {
      for (const exercise of workout.exercises) {
        if (!names.has(exercise.id)) names.set(exercise.id, exercise.name);
      }
    }
    return names;
  }, [history]);

  const activeFilterLabel = useMemo(() => {
    if (activeFilter === "all") return "All sessions";
    if (activeFilter === "cardio-all") return "Cardio, recovery & rest";
    if (activeFilter === "open") return "Open workouts";
    return liftingDays.find((day) => day.id === activeFilter)?.focus ?? "Filtered sessions";
  }, [activeFilter, liftingDays]);

  const exerciseFilterLabel = exerciseFilter ? exerciseNames.get(exerciseFilter) ?? exerciseFilter : null;
  const hasActiveFilters = activeFilter !== "all" || exerciseFilter !== null;
  const hasCardioHistory = history.some((w) => (w.dayType ?? "lift") !== "lift");
  const hasOpenHistory = history.some((w) => w.dayId === "open");

  const toggleSession = (id: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setActiveFilter("all");
    setExerciseFilter(null);
  };

  const filteredSummary = hasActiveFilters
    ? exerciseFilterLabel
      ? `${activeFilterLabel} · filtered by ${exerciseFilterLabel}`
      : activeFilterLabel
    : "All logged sessions.";

  return (
    <PageLayout className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 pt-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="section-label">Training Log</p>
            <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-text-primary">History</h1>
            <p className="mt-1 max-w-[28rem] text-sm leading-relaxed text-text-muted">
              Find, review, and edit past sessions.
            </p>
          </div>
          {history.length > 0 && (
            <div className="chip chip-muted shrink-0 px-3 py-2 text-[11px] font-semibold text-text-secondary">
              {history.length} logged
            </div>
          )}
        </div>

        {history.length > 0 && (
          <section className="surface-card rounded-[1.6rem] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="section-label">Filters</p>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  Showing {filteredHistory.length} of {history.length} session{history.length !== 1 ? "s" : ""}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">{filteredSummary}</p>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn-ghost shrink-0 px-3 py-2 text-xs font-semibold">
                  Clear
                </button>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="section-label">Day Filters</p>
                <p className="text-[11px] text-text-dim">Tap any exercise tag to filter.</p>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    activeFilter === "all"
                      ? "btn-primary text-white"
                      : "border border-border-card bg-white/[0.04] text-text-muted active:text-text-secondary"
                  }`}
                >
                  All
                </button>
                {liftingDays.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => setActiveFilter(day.id)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      activeFilter === day.id
                        ? "btn-primary text-white"
                        : "border border-border-card bg-white/[0.04] text-text-muted active:text-text-secondary"
                    }`}
                  >
                    {day.focus}
                  </button>
                ))}
                {hasOpenHistory && (
                  <button
                    onClick={() => setActiveFilter("open")}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      activeFilter === "open"
                        ? "btn-primary text-white"
                        : "border border-border-card bg-white/[0.04] text-text-muted active:text-text-secondary"
                    }`}
                  >
                    Open
                  </button>
                )}
                {hasCardioHistory && (
                  <button
                    onClick={() => setActiveFilter("cardio-all")}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      activeFilter === "cardio-all"
                        ? "btn-primary text-white"
                        : "border border-border-card bg-white/[0.04] text-text-muted active:text-text-secondary"
                    }`}
                  >
                    Cardio, Recovery & Rest
                  </button>
                )}
              </div>
            </div>

            {exerciseFilterLabel && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-accent-red/15 bg-accent-red/8 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-red">Exercise Filter</p>
                  <p className="truncate text-sm font-medium text-text-primary">{exerciseFilterLabel}</p>
                </div>
                <button
                  onClick={() => setExerciseFilter(null)}
                  className="btn-ghost shrink-0 px-3 py-2 text-xs font-semibold text-accent-red"
                >
                  Clear
                </button>
              </div>
            )}
          </section>
        )}
      </header>

      {history.length === 0 ? (
        <section className="surface-card flex flex-col items-center gap-6 rounded-[1.75rem] p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-red/10">
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-accent-red">
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div className="flex max-w-[18rem] flex-col gap-2">
            <p className="font-[var(--font-display)] text-xl tracking-wide text-text-primary">No workouts yet</p>
            <p className="text-sm leading-relaxed text-text-muted">
              Finish a workout and it will show up here.
            </p>
          </div>
          <button onClick={() => navigate("/")} className="btn-primary px-8 py-3 text-sm font-semibold text-white">
            Start Workout
          </button>
        </section>
      ) : filteredHistory.length === 0 ? (
        <section className="surface-card flex flex-col items-center gap-5 rounded-[1.75rem] p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/[0.04]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6 text-text-dim">
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5L21 21" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex max-w-[18rem] flex-col gap-2">
            <p className="font-semibold text-text-primary">No matching sessions</p>
            <p className="text-sm leading-relaxed text-text-muted">
              Try another filter, or clear everything to see your full history.
            </p>
          </div>
          <button onClick={clearFilters} className="btn-secondary px-5 py-3 text-sm font-semibold">
            Reset Filters
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-6">
          {monthGroups.map((group) => (
            <section key={group.label} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <h2 className="shrink-0 text-xs font-bold uppercase tracking-[0.2em] text-text-muted">{group.label}</h2>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <span className="shrink-0 text-[11px] text-text-dim">
                  {group.workouts.length} session{group.workouts.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {group.workouts.map((workout, index) => {
                  const expanded = expandedSessions.has(workout.id);
                  const stats = calcStats(workout);
                  const prev = findPrevSession(workout, history);
                  const progress = calcProgress(workout, prev);
                  const color = getDayColor(workout);
                  const isCardioEntry = (workout.dayType ?? "lift") !== "lift";

                  return (
                    <section
                      key={workout.id}
                      className="animate-fade-up overflow-hidden rounded-[1.6rem]"
                      style={{
                        animationDelay: `${index * 35}ms`,
                        background: `linear-gradient(180deg, ${color}0D 0%, rgba(18, 22, 31, 0.96) 26%, rgba(11, 14, 22, 0.98) 100%)`,
                        border: `1px solid ${expanded ? `${color}24` : "rgba(255,255,255,0.08)"}`,
                        boxShadow: expanded
                          ? `0 22px 44px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px ${color}0C`
                          : `0 18px 38px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.03)`,
                      }}
                    >
                      <button onClick={() => toggleSession(workout.id)} className="w-full text-left">
                        <div className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div
                              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: color, boxShadow: `0 0 0 5px ${color}18` }}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                                      style={{ background: `${color}18`, color }}
                                    >
                                      {getWorkoutTypeLabel(workout)}
                                    </span>
                                    {progress && (
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tabular-nums ${
                                          progress.type === "increase"
                                            ? "bg-accent-green/12 text-accent-green"
                                            : progress.type === "decrease"
                                              ? "bg-accent-red/12 text-accent-red"
                                              : "bg-white/[0.06] text-text-muted"
                                        }`}
                                      >
                                        {progress.type === "increase" ? "+" : progress.type === "decrease" ? "" : ""}
                                        {progress.volumePercent.toFixed(0)}%
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="mt-2 text-[17px] font-semibold leading-tight text-text-primary">
                                    {getWorkoutTitle(workout)}
                                  </h3>
                                  <p className="mt-1 text-[12px] text-text-muted">{formatDayDate(workout.date)}</p>
                                </div>

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04] text-text-dim">
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                                  >
                                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </div>
                              </div>

                              {isCardioEntry ? (
                                <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-dim">
                                    Logged Activity
                                  </p>
                                  <p className="mt-1 text-sm text-text-primary">
                                    {workout.activityName ?? `${getWorkoutTypeLabel(workout)} session`}
                                  </p>
                                </div>
                              ) : (
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">Exercises</p>
                                    <p className="mt-1.5 text-base font-semibold tabular-nums text-text-primary">{stats.totalExercises}</p>
                                  </div>
                                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">Sets</p>
                                    <p className="mt-1.5 text-base font-semibold tabular-nums text-text-primary">{stats.totalSets}</p>
                                  </div>
                                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">Volume</p>
                                    <p className="mt-1.5 text-base font-semibold tabular-nums text-text-primary">
                                      {formatVolume(stats.totalVolume)}kg
                                    </p>
                                  </div>
                                </div>
                              )}

                              {workout.exercises.length > 0 && (
                                <div className="mt-4 flex flex-col gap-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-dim">Exercises</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {workout.exercises.map((ex) => (
                                      <span
                                        key={ex.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!ex.skipped) setExerciseFilter((prev) => (prev === ex.id ? null : ex.id));
                                        }}
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                          ex.skipped
                                            ? "bg-white/[0.04] text-text-dim line-through"
                                            : exerciseFilter === ex.id
                                              ? "bg-accent-red/18 text-accent-red"
                                              : "bg-white/[0.06] text-text-secondary active:bg-white/[0.1]"
                                        }`}
                                      >
                                        {ex.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>

                      {expanded && (
                        <div className="border-t border-white/[0.06] px-3 pb-3 pt-3">
                          <div className="flex flex-col gap-2.5">
                            {workout.exercises.map((exercise) => (
                              <ExerciseSummaryRow
                                key={`${workout.id}-${exercise.id}-${exercise.name}`}
                                exercise={exercise}
                              />
                            ))}
                          </div>

                          {deleteConfirmId === workout.id ? (
                            <div className="mt-3 flex flex-col gap-3 rounded-[1.3rem] border border-accent-red/15 bg-accent-red/8 p-4">
                              <div className="flex flex-col gap-1">
                                <p className="text-sm font-semibold text-text-primary">Delete this workout?</p>
                                <p className="text-sm text-text-secondary">
                                  This removes the logged session from history and cannot be undone.
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-2.5">
                                <button
                                  onClick={() => {
                                    deleteHistoryEntry(workout.id);
                                    setDeleteConfirmId(null);
                                    setExpandedSessions((prevSet) => {
                                      const next = new Set(prevSet);
                                      next.delete(workout.id);
                                      return next;
                                    });
                                  }}
                                  className="btn-primary py-3 text-sm font-semibold text-white"
                                >
                                  Delete
                                </button>
                                <button onClick={() => setDeleteConfirmId(null)} className="btn-ghost py-3 text-sm">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                              <button
                                onClick={() => navigate(`/history/${workout.id}/edit`)}
                                className="btn-primary px-4 py-3 text-sm font-semibold text-white"
                              >
                                Edit Workout
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(workout.id)}
                                className="btn-ghost flex h-[3.1rem] w-[3.1rem] items-center justify-center"
                                aria-label="Delete workout"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-text-dim">
                                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <section className="surface-card mt-1 rounded-[1.6rem] p-4">
          <div className="flex flex-col gap-1">
            <p className="section-label text-accent-red">Danger Zone</p>
            <p className="text-sm font-semibold text-text-primary">Clear All Data</p>
            <p className="text-sm leading-relaxed text-text-muted">
              Removes every logged session and clears any in-progress workout saved on this device.
            </p>
          </div>

          {showClearConfirm ? (
            <div className="mt-4 flex flex-col gap-4 rounded-[1.3rem] border border-accent-red/15 bg-accent-red/8 p-4">
              <p className="text-sm text-text-secondary">Delete all workout history? This cannot be undone.</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    clearWorkouts();
                    setShowClearConfirm(false);
                  }}
                  className="btn-primary py-3 text-sm font-semibold text-white"
                >
                  Delete
                </button>
                <button onClick={() => setShowClearConfirm(false)} className="btn-ghost py-3 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowClearConfirm(true)} className="btn-ghost mt-4 w-full py-3 text-sm font-semibold">
              Clear All Data
            </button>
          )}
        </section>
      )}
    </PageLayout>
  );
}

/* ─── Exercise Summary (expanded view) ─── */

function ExerciseSummaryRow({
  exercise,
}: {
  exercise: ExerciseEntry;
}) {
  if (exercise.skipped) {
    return (
      <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <p className="text-sm text-text-dim line-through">{exercise.name}</p>
          <span className="rounded-full bg-white/[0.05] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">
            Skipped
          </span>
        </div>
      </div>
    );
  }

  if (exercise.sets.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
        <p className="text-sm text-text-dim">{exercise.name} — No sets logged</p>
      </div>
    );
  }

  const bestSet = exercise.sets.reduce((best, s) => (s.weight * s.reps > best.weight * best.reps ? s : best), exercise.sets[0]);
  const totalReps = exercise.sets.reduce((sum, set) => sum + set.reps, 0);
  const failureSets = exercise.sets.filter((set) => set.toFailure).length;

  return (
    <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.03] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-[14px] font-semibold text-text-primary">{exercise.name}</h4>
          <p className="mt-1 text-[11px] text-text-dim">
            {exercise.sets.length} set{exercise.sets.length !== 1 ? "s" : ""} logged · {totalReps} total reps
          </p>
        </div>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-text-secondary">
          Best {bestSet.weight > 0 ? `${bestSet.weight}kg` : "BW"} × {bestSet.reps}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-[1rem] border border-white/[0.05] bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">Sets</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">{exercise.sets.length}</p>
        </div>
        <div className="rounded-[1rem] border border-white/[0.05] bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">Volume</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">
            {formatVolume(exercise.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0))}
          </p>
        </div>
        <div className="rounded-[1rem] border border-white/[0.05] bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">Failure</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">
            {failureSets}
          </p>
        </div>
      </div>
    </div>
  );
}
