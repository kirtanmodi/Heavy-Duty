import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { useWorkoutStore } from "../store/workoutStore";
import { programs } from "../data/programs";
import type { WorkoutEntry, ExerciseEntry, SetEntry } from "../types";

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${day} · ${dateStr}`;
}

function formatMonthYear(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function calcStats(workout: WorkoutEntry) {
  let totalSets = 0;
  let totalVolume = 0;
  for (const ex of workout.exercises) {
    totalSets += ex.sets.length;
    for (const s of ex.sets) totalVolume += s.weight * s.reps;
  }
  return { totalExercises: workout.exercises.length, totalSets, totalVolume };
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

function getPrevExerciseSets(exerciseId: string, prevSession: WorkoutEntry | null): SetEntry[] | null {
  if (!prevSession) return null;
  const ex = prevSession.exercises.find((e) => e.id === exerciseId);
  return ex?.sets.length ? ex.sets : null;
}

function calcStreak(history: WorkoutEntry[]): number {
  if (history.length === 0) return 0;
  let streak = 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const uniqueDays = new Set<string>();
  for (const w of history) {
    const d = new Date(w.date);
    uniqueDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  for (let i = 0; i <= 365; i++) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (uniqueDays.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function calcTotalVolume(history: WorkoutEntry[]): number {
  let total = 0;
  for (const w of history) {
    for (const ex of w.exercises) {
      for (const s of ex.sets) total += s.weight * s.reps;
    }
  }
  return total;
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
  "day-1": "accent-red",
  "day-2": "accent-orange",
  "day-3": "accent-blue",
  "day-4": "accent-green",
  open: "accent-yellow",
};

function getDayColor(dayId: string): string {
  return dayColors[dayId] || "accent-yellow";
}

export function History() {
  const navigate = useNavigate();
  const history = useWorkoutStore((s) => s.history);
  const clearWorkouts = useWorkoutStore((s) => s.clearAll);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [exerciseFilter, setExerciseFilter] = useState<string | null>(null);

  const liftingDays = programs[0].days.filter((d) => d.type === "lift");
  const filteredHistory = useMemo(() => {
    let filtered = activeFilter === "all" ? history : history.filter((w) => w.dayId === activeFilter);
    if (exerciseFilter) {
      filtered = filtered.filter((w) => w.exercises.some((e) => e.id === exerciseFilter));
    }
    return filtered;
  }, [history, activeFilter, exerciseFilter]);
  const monthGroups = useMemo(() => groupByMonth(filteredHistory), [filteredHistory]);

  const streak = useMemo(() => calcStreak(history), [history]);
  const totalVol = useMemo(() => calcTotalVolume(history), [history]);
  const thisWeek = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return history.filter((w) => new Date(w.date) >= startOfWeek).length;
  }, [history]);

  const toggleSession = (id: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <PageLayout className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-end justify-between pt-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-text-primary">History</h1>
          <p className="text-sm text-text-muted">
            {history.length} workout{history.length !== 1 ? "s" : ""} logged
          </p>
        </div>
      </header>

      {/* Stats row */}
      {history.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-0.5 rounded-xl bg-bg-card p-3 card-surface">
            <span className="text-xl font-bold tabular-nums text-accent-red">{streak}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Streak</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-xl bg-bg-card p-3 card-surface">
            <span className="text-xl font-bold tabular-nums text-accent-orange">{thisWeek}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">This Week</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-xl bg-bg-card p-3 card-surface">
            <span className="text-xl font-bold tabular-nums text-accent-green">{formatVolume(totalVol)}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">Total Vol</span>
          </div>
        </div>
      )}

      {/* Filter chips */}
      {history.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveFilter("all")}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              activeFilter === "all" ? "btn-primary text-white" : "border border-border-card bg-bg-card text-text-muted active:text-text-secondary"
            }`}
          >
            All
          </button>
          {liftingDays.map((day) => (
            <button
              key={day.id}
              onClick={() => setActiveFilter(day.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                activeFilter === day.id ? "btn-primary text-white" : "border border-border-card bg-bg-card text-text-muted active:text-text-secondary"
              }`}
            >
              {day.focus}
            </button>
          ))}
          {history.some((w) => w.dayId === "open") && (
            <button
              onClick={() => setActiveFilter("open")}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                activeFilter === "open" ? "btn-primary text-white" : "border border-border-card bg-bg-card text-text-muted active:text-text-secondary"
              }`}
            >
              Open
            </button>
          )}
        </div>
      )}

      {/* Active exercise filter chip */}
      {exerciseFilter && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExerciseFilter(null)}
            className="flex items-center gap-1.5 rounded-full bg-accent-red/15 px-3 py-1.5 text-xs font-semibold text-accent-red"
          >
            <span>
              {history.flatMap((w) => w.exercises).find((e) => e.id === exerciseFilter)?.name ?? exerciseFilter}
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 ? (
        <section className="flex flex-col items-center gap-6 rounded-[14px] bg-bg-card card-surface p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-red/10">
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-accent-red">
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-[var(--font-display)] text-xl tracking-wide text-text-primary">No workouts yet</p>
            <p className="text-sm leading-relaxed text-text-muted">Complete your first workout and it will show up here.</p>
          </div>
          <button onClick={() => navigate("/")} className="rounded-[10px] btn-primary px-8 py-3 text-sm font-semibold text-white">
            Start Today's Workout
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-5">
          {monthGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-2.5">
              {/* Month header */}
              <div className="flex items-center gap-3">
                <h2 className="shrink-0 text-xs font-bold uppercase tracking-widest text-text-muted">{group.label}</h2>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Timeline */}
              <div className="relative flex flex-col gap-2.5 pl-6">
                {/* Timeline line */}
                <div className="absolute bottom-4 left-[7px] top-4 w-px bg-border" />

                {group.workouts.map((workout, index) => {
                  const expanded = expandedSessions.has(workout.id);
                  const stats = calcStats(workout);
                  const prev = findPrevSession(workout, history);
                  const progress = calcProgress(workout, prev);
                  const color = getDayColor(workout.dayId);

                  return (
                    <div key={workout.id} className="relative animate-fade-up" style={{ animationDelay: `${index * 40}ms` }}>
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-6 top-5 h-[15px] w-[15px] rounded-full border-[2.5px] border-bg-primary`}
                        style={{ backgroundColor: `var(--color-${color})` }}
                      />

                      <section className="overflow-hidden rounded-2xl bg-bg-card card-surface">
                        <button onClick={() => toggleSession(workout.id)} className="w-full text-left">
                          {/* Card header */}
                          <div className="px-4 pb-3 pt-4">
                            <div className="flex items-start justify-between">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2.5">
                                  <h3 className="text-[15px] font-bold text-text-primary">{workout.day.includes(" — ") ? workout.day.split(" — ")[1] : workout.day}</h3>
                                  {progress && (
                                    <span
                                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none ${
                                        progress.type === "increase"
                                          ? "bg-accent-green/12 text-accent-green"
                                          : progress.type === "decrease"
                                            ? "bg-accent-red/12 text-accent-red"
                                            : "bg-bg-input text-text-muted"
                                      }`}
                                    >
                                      {progress.type === "increase" ? "+" : progress.type === "decrease" ? "" : ""}
                                      {progress.volumePercent.toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-text-muted">{formatRelativeDate(workout.date)}</p>
                              </div>
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                className={`mt-1 h-3.5 w-3.5 text-text-dim transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                              >
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </div>
                          </div>

                          {/* Inline stats */}
                          <div className="flex items-center gap-4 px-4 pb-3.5 text-[11px]">
                            <span className="tabular-nums text-text-secondary">
                              <span className="font-semibold text-text-primary">{stats.totalExercises}</span> exercises
                            </span>
                            <span className="text-text-dim">·</span>
                            <span className="tabular-nums text-text-secondary">
                              <span className="font-semibold text-text-primary">{stats.totalSets}</span> sets
                            </span>
                            <span className="text-text-dim">·</span>
                            <span className="tabular-nums text-text-secondary">
                              <span className="font-semibold text-text-primary">{formatVolume(stats.totalVolume)}</span>kg
                            </span>
                          </div>

                          {/* Exercise name pills */}
                          <div className="flex flex-wrap gap-1 border-t border-border px-4 py-2.5">
                            {workout.exercises.map((ex) => (
                              <span
                                key={ex.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExerciseFilter((prev) => (prev === ex.id ? null : ex.id));
                                }}
                                className={`rounded-md px-2 py-0.5 text-[10px] font-medium cursor-pointer transition-colors ${
                                  exerciseFilter === ex.id
                                    ? "bg-accent-red/20 text-accent-red"
                                    : "bg-bg-input text-text-secondary active:bg-bg-input/70"
                                }`}
                              >
                                {ex.name}
                              </span>
                            ))}
                          </div>
                        </button>

                        {/* Expanded detail */}
                        {expanded && (
                          <div className="flex flex-col gap-0 border-t border-border">
                            {workout.exercises.map((exercise, exIdx) => (
                              <ExerciseDetail
                                key={exercise.id}
                                exercise={exercise}
                                prevSets={getPrevExerciseSets(exercise.id, prev)}
                                isLast={exIdx === workout.exercises.length - 1}
                              />
                            ))}
                            <button
                              onClick={() => navigate(`/history/${workout.id}/edit`)}
                              className="m-3 rounded-xl btn-ghost py-2.5 text-xs font-semibold transition-colors"
                            >
                              Edit Workout
                            </button>
                          </div>
                        )}
                      </section>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clear data */}
      {history.length > 0 && (
        <section className="mt-2">
          {showClearConfirm ? (
            <div className="flex flex-col gap-4 rounded-[14px] border border-accent-red/15 bg-accent-red/8 p-5">
              <p className="text-sm text-text-secondary">Delete all workout history? This cannot be undone.</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    clearWorkouts();
                    setShowClearConfirm(false);
                  }}
                  className="rounded-[10px] btn-primary py-3 text-sm font-semibold text-white"
                >
                  Delete
                </button>
                <button onClick={() => setShowClearConfirm(false)} className="rounded-[10px] btn-ghost py-3 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full rounded-[14px] bg-bg-card card-surface py-4 text-sm text-text-muted transition-colors active:bg-bg-card-hover"
            >
              Clear All Data
            </button>
          )}
        </section>
      )}
    </PageLayout>
  );
}

/* ─── Exercise Detail (expanded view) ─── */

function ExerciseDetail({
  exercise,
  prevSets,
  isLast,
}: {
  exercise: ExerciseEntry;
  prevSets: SetEntry[] | null;
  isLast: boolean;
}) {
  if (exercise.sets.length === 0) {
    return (
      <div className={`px-4 py-3 ${!isLast ? "border-b border-border/50" : ""}`}>
        <p className="text-xs text-text-dim">{exercise.name} — No sets logged</p>
      </div>
    );
  }

  const bestSet = exercise.sets.reduce((best, s) => (s.weight * s.reps > best.weight * best.reps ? s : best), exercise.sets[0]);

  return (
    <div className={`px-4 py-3.5 ${!isLast ? "border-b border-border/50" : ""}`}>
      {/* Exercise name + best set */}
      <div className="mb-2.5 flex items-center justify-between">
        <h4 className="text-[13px] font-bold text-text-primary">{exercise.name}</h4>
        <span className="text-[10px] tabular-nums text-text-dim">
          best: {bestSet.weight > 0 ? `${bestSet.weight}kg` : "BW"} × {bestSet.reps}
        </span>
      </div>

      {/* Sets grid */}
      <div className="flex flex-col gap-1">
        {exercise.sets.map((set, idx) => {
          const prevSet = prevSets?.[idx] ?? null;
          const wDelta = prevSet ? set.weight - prevSet.weight : 0;
          const rDelta = prevSet ? set.reps - prevSet.reps : 0;
          const volume = set.weight * set.reps;
          const prevVolume = prevSet ? prevSet.weight * prevSet.reps : 0;
          const volDelta = prevSet ? volume - prevVolume : 0;

          return (
            <div key={idx} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-input/50">
              {/* Set number */}
              <span className="w-4 text-center text-[10px] font-bold text-text-dim">{idx + 1}</span>

              {/* Weight */}
              <div className="flex min-w-[60px] items-baseline gap-1">
                <span className="text-sm font-semibold tabular-nums text-text-primary">
                  {set.weight > 0 ? `${set.weight}` : "BW"}
                </span>
                {set.weight > 0 && <span className="text-[10px] text-text-dim">kg</span>}
                {wDelta !== 0 && (
                  <span className={`text-[9px] font-bold tabular-nums ${wDelta > 0 ? "text-accent-green" : "text-accent-red"}`}>
                    {wDelta > 0 ? "+" : ""}{wDelta}
                  </span>
                )}
              </div>

              {/* Divider */}
              <span className="text-[10px] text-text-dim">×</span>

              {/* Reps */}
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold tabular-nums text-text-primary">{set.reps}</span>
                {rDelta !== 0 && (
                  <span className={`text-[9px] font-bold tabular-nums ${rDelta > 0 ? "text-accent-green" : "text-accent-red"}`}>
                    {rDelta > 0 ? "+" : ""}{rDelta}
                  </span>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Volume */}
              <div className="flex items-center gap-1.5">
                {set.toFailure && (
                  <span className="rounded bg-accent-red/15 px-1.5 py-0.5 text-[9px] font-bold text-accent-red">F</span>
                )}
                <span className="text-[11px] tabular-nums text-text-muted">{volume > 0 ? `${volume.toLocaleString()}` : "—"}</span>
                {volDelta !== 0 && (
                  <span className={`text-[9px] font-bold tabular-nums ${volDelta > 0 ? "text-accent-green" : "text-accent-red"}`}>
                    {volDelta > 0 ? "+" : ""}{volDelta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* First session indicator */}
      {!prevSets && <p className="mt-1.5 text-[10px] text-text-dim">First session</p>}
    </div>
  );
}
