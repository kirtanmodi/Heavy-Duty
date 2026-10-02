import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { useWorkoutStore } from "../store/workoutStore";
import { programs } from "../data/programs";
import type { WorkoutEntry, ExerciseEntry, SetEntry } from "../types";
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

function formatSet(set: SetEntry): string {
  return `${set.weight > 0 ? `${set.weight}kg` : "BW"} × ${set.reps}`;
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

/** Small type dot: green lift, blue cardio, softer blue recovery, dim rest, yellow open. */
function getDotClass(workout: WorkoutEntry): string {
  const dayType = workout.dayType ?? "lift";
  if (dayType === "cardio") return "bg-accent-blue";
  if (dayType === "recovery") return "bg-accent-blue/60";
  if (dayType === "rest") return "bg-text-dim";
  return workout.dayId === "open" ? "bg-accent-yellow" : "bg-accent-green";
}

function getWorkoutTitle(workout: WorkoutEntry): string {
  return workout.day.includes(" — ") ? workout.day.split(" — ")[1] : workout.day;
}

function getWorkoutTypeLabel(workout: WorkoutEntry): string {
  const dayType = workout.dayType ?? "lift";
  if (dayType === "lift") return workout.dayId === "open" ? "Open" : "Lift";
  return dayType.charAt(0).toUpperCase() + dayType.slice(1);
}

const filterChipBase = "chip h-9 shrink-0 px-3.5 font-medium transition-colors";
const filterChipActive = "bg-[#f4f4f5] text-[#0b0b0c]";
const filterChipIdle = "text-text-secondary active:bg-fill-strong";

function filterChipClass(active: boolean): string {
  return `${filterChipBase} ${active ? filterChipActive : filterChipIdle}`;
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

  return (
    <PageLayout className="flex flex-col gap-7">
      <header className="flex flex-col gap-4 pt-2">
        <div className="min-w-0 px-1">
          <h1 className="page-title">History</h1>
          {history.length > 0 && (
            <p className="mt-1 text-[13px] tabular-nums text-text-muted">
              {history.length} session{history.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {history.length > 0 && (
          <div className="flex flex-col gap-3">
            <div
              className="-mx-[1.125rem] flex gap-2 overflow-x-auto scrollbar-hide px-[1.125rem]"
              role="group"
              aria-label="Filter sessions"
            >
              <button
                onClick={() => setActiveFilter("all")}
                aria-pressed={activeFilter === "all"}
                className={filterChipClass(activeFilter === "all")}
              >
                All
              </button>
              {liftingDays.map((day) => (
                <button
                  key={day.id}
                  onClick={() => setActiveFilter(day.id)}
                  aria-pressed={activeFilter === day.id}
                  className={filterChipClass(activeFilter === day.id)}
                >
                  {day.focus}
                </button>
              ))}
              {hasOpenHistory && (
                <button
                  onClick={() => setActiveFilter("open")}
                  aria-pressed={activeFilter === "open"}
                  className={filterChipClass(activeFilter === "open")}
                >
                  Open
                </button>
              )}
              {hasCardioHistory && (
                <button
                  onClick={() => setActiveFilter("cardio-all")}
                  aria-pressed={activeFilter === "cardio-all"}
                  className={filterChipClass(activeFilter === "cardio-all")}
                >
                  Cardio, recovery & rest
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <div className={`flex min-h-9 items-center justify-between gap-3 ${exerciseFilterLabel ? "" : "pl-1"}`}>
                <div className="flex min-w-0 items-center gap-2.5">
                  {exerciseFilterLabel && (
                    <button
                      onClick={() => setExerciseFilter(null)}
                      className={`${filterChipBase} ${filterChipActive} min-w-0 pr-2.5`}
                      aria-label={`Remove ${exerciseFilterLabel} filter`}
                    >
                      <span className="truncate">{exerciseFilterLabel}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="h-3.5 w-3.5 shrink-0 opacity-60"
                        aria-hidden="true"
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  )}
                  <span className="shrink-0 text-[13px] tabular-nums text-text-muted">
                    {filteredHistory.length} of {history.length}
                  </span>
                </div>
                <button onClick={clearFilters} className="btn-tertiary -my-1 -mr-1 shrink-0 px-2 text-[13px]">
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {history.length === 0 ? (
        <section className="flex flex-col items-center gap-3 px-6 pt-12 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="h-7 w-7 text-text-muted"
            aria-hidden="true"
          >
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <div className="flex max-w-[18rem] flex-col gap-1">
            <p className="section-title">No workouts yet</p>
            <p className="text-[15px] leading-relaxed text-text-muted">
              Finish a workout and it will show up here.
            </p>
          </div>
          <button onClick={() => navigate("/")} className="btn-primary mt-2 px-7 text-[15px]">
            Start workout
          </button>
        </section>
      ) : filteredHistory.length === 0 ? (
        <section className="flex flex-col items-center gap-3 px-6 pt-12 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="h-7 w-7 text-text-muted"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M16.5 16.5L21 21" />
          </svg>
          <div className="flex max-w-[18rem] flex-col gap-1">
            <p className="section-title">No matching sessions</p>
            <p className="text-[15px] leading-relaxed text-text-muted">
              Try another filter, or clear everything to see your full history.
            </p>
          </div>
          <button onClick={clearFilters} className="btn-secondary mt-2 px-6 text-[15px]">
            Reset filters
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-7">
          {monthGroups.map((group) => (
            <section key={group.label} className="flex flex-col gap-2.5">
              <div className="flex min-h-6 items-center justify-between gap-3 px-1">
                <h2 className="section-label">{group.label}</h2>
                <span className="shrink-0 text-[13px] tabular-nums text-text-muted">
                  {group.workouts.length} session{group.workouts.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {group.workouts.map((workout, index) => {
                  const expanded = expandedSessions.has(workout.id);
                  const stats = calcStats(workout);
                  const prev = findPrevSession(workout, history);
                  const progress = calcProgress(workout, prev);
                  const isCardioEntry = (workout.dayType ?? "lift") !== "lift";
                  const typeLabel = getWorkoutTypeLabel(workout);

                  const title = getWorkoutTitle(workout);
                  const showTypeLabel =
                    typeLabel !== "Lift" && !title.toLowerCase().includes(typeLabel.toLowerCase());

                  return (
                    <section
                      key={workout.id}
                      className="surface-card animate-fade-up overflow-hidden rounded-[1.25rem]"
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <button
                        onClick={() => toggleSession(workout.id)}
                        aria-expanded={expanded}
                        className={`flex w-full items-start gap-3 px-4 pt-3.5 text-left active:bg-fill ${
                          workout.exercises.length > 0 ? "pb-3" : "pb-3.5"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${getDotClass(workout)}`} aria-hidden="true" />
                            <h3 className="section-title min-w-0 truncate">
                              {title}
                            </h3>
                          </div>
                          <p className="mt-0.5 text-[13px] text-text-muted">
                            {formatDayDate(workout.date)}
                            {showTypeLabel && <> · {typeLabel}</>}
                          </p>

                          {isCardioEntry ? (
                            <p className="mt-1.5 truncate text-[13px] text-text-secondary">
                              {workout.activityName ?? `${typeLabel} session`}
                            </p>
                          ) : (
                            <p className="mt-1.5 text-[13px] tabular-nums text-text-secondary">
                              {stats.totalExercises} exercise{stats.totalExercises !== 1 ? "s" : ""}
                              <span className="text-text-dim"> · </span>
                              {stats.totalSets} set{stats.totalSets !== 1 ? "s" : ""}
                              <span className="text-text-dim"> · </span>
                              {formatVolume(stats.totalVolume)} kg
                              {progress && (
                                <>
                                  <span className="text-text-dim"> · </span>
                                  <span
                                    className={
                                      progress.type === "increase"
                                        ? "text-accent-green"
                                        : progress.type === "decrease"
                                          ? "text-accent-orange"
                                          : "text-text-muted"
                                    }
                                  >
                                    {progress.type === "increase" ? "+" : ""}
                                    {progress.volumePercent.toFixed(0)}%
                                  </span>
                                </>
                              )}
                            </p>
                          )}
                        </div>

                        <span
                          className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-text-muted"
                          aria-hidden="true"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`h-[18px] w-[18px] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </span>
                      </button>

                      {workout.exercises.length > 0 && (
                        /* Tapping the row's empty space still toggles the card, as it did when tags lived inside the button. */
                        <div
                          className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 pb-3.5"
                          onClick={() => toggleSession(workout.id)}
                        >
                          {workout.exercises.map((ex) =>
                            ex.skipped ? (
                              <span
                                key={ex.id}
                                onClick={(e) => e.stopPropagation()}
                                className="chip chip-muted min-h-8 shrink-0 text-[12px] font-medium text-text-muted line-through"
                              >
                                {ex.name}
                              </span>
                            ) : (
                              <button
                                key={ex.id}
                                type="button"
                                aria-pressed={exerciseFilter === ex.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExerciseFilter((prev) => (prev === ex.id ? null : ex.id));
                                }}
                                className={`chip chip-muted min-h-8 shrink-0 text-[12px] font-medium transition-colors ${
                                  exerciseFilter === ex.id
                                    ? "bg-fill-strong text-text-primary ring-1 ring-inset ring-white/15"
                                    : "text-text-secondary active:bg-fill-strong"
                                }`}
                              >
                                {ex.name}
                              </button>
                            ),
                          )}
                        </div>
                      )}

                      {expanded && (
                        <div className="border-t border-separator px-4 pb-4">
                          {workout.exercises.length > 0 && (
                            <div className="flex flex-col divide-y divide-separator">
                              {workout.exercises.map((exercise) => (
                                <ExerciseSummaryRow
                                  key={`${workout.id}-${exercise.id}-${exercise.name}`}
                                  exercise={exercise}
                                />
                              ))}
                            </div>
                          )}

                          {deleteConfirmId === workout.id ? (
                            <div className="mt-3 flex flex-col gap-3">
                              <div className="flex flex-col gap-0.5">
                                <p className="text-[15px] font-semibold text-text-primary">Delete this workout?</p>
                                <p className="text-[13px] leading-relaxed text-text-secondary">
                                  This removes the logged session from history and cannot be undone.
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
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
                                  className="btn-danger text-[15px]"
                                >
                                  Delete
                                </button>
                                <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary text-[15px]">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                onClick={() => navigate(`/history/${workout.id}/edit`)}
                                className="btn-secondary min-w-0 flex-1 text-[15px]"
                              >
                                Edit workout
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(workout.id)}
                                className="btn-icon h-12 w-12 shrink-0"
                                aria-label="Delete workout"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.75"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-[18px] w-[18px]"
                                  aria-hidden="true"
                                >
                                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
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
        <section className="flex flex-col items-center pt-2">
          {showClearConfirm ? (
            <div className="surface-card flex w-full flex-col gap-3 rounded-[1.25rem] p-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-[15px] font-semibold text-text-primary">Delete all workout history?</p>
                <p className="text-[13px] leading-relaxed text-text-secondary">
                  Removes every logged session and clears any in-progress workout saved on this device. This cannot be
                  undone.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    clearWorkouts();
                    setShowClearConfirm(false);
                  }}
                  className="btn-danger text-[15px]"
                >
                  Delete
                </button>
                <button onClick={() => setShowClearConfirm(false)} className="btn-secondary text-[15px]">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="btn-tertiary px-4 text-[14px] text-accent-red"
            >
              Clear all data
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
      <div className="flex items-center justify-between gap-3 py-3">
        <p className="min-w-0 truncate text-[15px] text-text-muted line-through">{exercise.name}</p>
        <span className="shrink-0 rounded-full bg-fill px-2 py-0.5 text-[12px] font-medium leading-tight text-text-muted">
          Skipped
        </span>
      </div>
    );
  }

  if (exercise.sets.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 py-3">
        <p className="min-w-0 truncate text-[15px] font-medium text-text-primary">{exercise.name}</p>
        <span className="shrink-0 text-[13px] text-text-muted">No sets logged</span>
      </div>
    );
  }

  const bestSet = exercise.sets.reduce((best, s) => (s.weight * s.reps > best.weight * best.reps ? s : best), exercise.sets[0]);
  const totalReps = exercise.sets.reduce((sum, set) => sum + set.reps, 0);
  const failureSets = exercise.sets.filter((set) => set.toFailure).length;
  const volume = exercise.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0);

  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="min-w-0 truncate text-[15px] font-medium text-text-primary">{exercise.name}</h4>
        <span className="shrink-0 text-[12px] tabular-nums text-text-muted">
          Best {bestSet.weight > 0 ? `${bestSet.weight}kg` : "BW"} × {bestSet.reps}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] tabular-nums">
        {exercise.sets.map((set, setIdx) => (
          <span
            key={setIdx}
            className={failureSets > 0 && !set.toFailure ? "text-text-muted" : "text-text-primary"}
          >
            {formatSet(set)}
          </span>
        ))}
      </div>

      <p className="mt-1 text-[12px] tabular-nums text-text-muted">
        {exercise.sets.length} set{exercise.sets.length !== 1 ? "s" : ""} · {totalReps} reps · {failureSets} to failure ·{" "}
        {formatVolume(volume)} kg
      </p>
    </div>
  );
}
