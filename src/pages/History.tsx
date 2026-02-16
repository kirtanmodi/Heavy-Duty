import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { useWorkoutStore } from "../store/workoutStore";
import { programs } from "../data/programs";
import type { WorkoutEntry, ExerciseEntry, SetEntry } from "../types";

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
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

export function History() {
  const navigate = useNavigate();
  const history = useWorkoutStore((s) => s.history);
  const clearWorkouts = useWorkoutStore((s) => s.clearAll);
  const updateHistoryEntry = useWorkoutStore((s) => s.updateHistoryEntry);
  const deleteHistoryEntry = useWorkoutStore((s) => s.deleteHistoryEntry);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editExercises, setEditExercises] = useState<ExerciseEntry[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const liftingDays = programs[0].days.filter((d) => d.type === "lift");
  const filteredHistory = activeFilter === "all" ? history : history.filter((w) => w.dayId === activeFilter);

  const toggleSession = (id: string) => {
    if (editingId === id) return;
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (workout: WorkoutEntry) => {
    setEditingId(workout.id);
    setEditExercises(workout.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditExercises([]);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const cleaned = editExercises.filter((e) => e.sets.some((s) => s.reps > 0));
    updateHistoryEntry(editingId, cleaned);
    setEditingId(null);
    setEditExercises([]);
  };

  const handleEditSetChange = (exIdx: number, setIdx: number, field: keyof SetEntry, value: number | boolean) => {
    setEditExercises((prev) => {
      const next = prev.map((e, i) => {
        if (i !== exIdx) return e;
        const sets = e.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s));
        return { ...e, sets };
      });
      return next;
    });
  };

  const handleEditAddSet = (exIdx: number) => {
    setEditExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        const lastSet = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [...e.sets, { weight: lastSet?.weight ?? 0, reps: lastSet?.reps ?? 0, toFailure: false, tempo: "4-1-4" }],
        };
      }),
    );
  };

  const handleEditRemoveSet = (exIdx: number, setIdx: number) => {
    setEditExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx || e.sets.length <= 1) return e;
        return { ...e, sets: e.sets.filter((_, j) => j !== setIdx) };
      }),
    );
  };

  const handleEditRemoveExercise = (exIdx: number) => {
    setEditExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const handleDeleteWorkout = (workoutId: string) => {
    deleteHistoryEntry(workoutId);
    setDeleteConfirmId(null);
    setEditingId(null);
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      next.delete(workoutId);
      return next;
    });
  };

  return (
    <PageLayout className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 pt-2">
        <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-text-primary">History</h1>
        <p className="text-sm text-text-muted">
          {history.length} workout{history.length !== 1 ? "s" : ""} logged
        </p>
      </header>

      {history.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveFilter("all")}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              activeFilter === "all" ? "bg-accent-red text-white" : "bg-bg-card text-text-muted active:text-text-secondary"
            }`}
          >
            All
          </button>
          {liftingDays.map((day) => (
            <button
              key={day.id}
              onClick={() => setActiveFilter(day.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                activeFilter === day.id ? "bg-accent-red text-white" : "bg-bg-card text-text-muted active:text-text-secondary"
              }`}
            >
              {day.focus}
            </button>
          ))}
        </div>
      )}

      {history.length === 0 ? (
        <section className="flex flex-col items-center gap-6 rounded-xl bg-bg-card p-8 text-center">
          <div className="flex flex-col gap-2">
            <p className="text-base font-medium text-text-primary">No workouts yet</p>
            <p className="text-sm text-text-muted">Complete your first workout and it will show up here.</p>
          </div>
          <button onClick={() => navigate("/")} className="rounded-md bg-accent-red px-8 py-3 text-sm font-semibold text-white active:scale-[0.99]">
            Start Training
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredHistory.map((workout) => {
            const expanded = expandedSessions.has(workout.id);
            const stats = calcStats(workout);
            const prev = findPrevSession(workout, history);
            const progress = calcProgress(workout, prev);
            const isEditing = editingId === workout.id;

            return (
              <section key={workout.id} className="overflow-hidden rounded-xl bg-bg-card">
                <button onClick={() => toggleSession(workout.id)} className="w-full text-left">
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex flex-col gap-0.5">
                      <h2 className="text-base font-semibold text-text-primary">{workout.day}</h2>
                      <p className="text-xs text-text-muted">{formatRelativeDate(workout.date)}</p>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`h-4 w-4 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between border-t border-border px-5 py-3">
                    <div className="flex items-center gap-5 text-xs">
                      <div className="flex flex-col">
                        <span className="text-text-muted">Exercises</span>
                        <span className="text-sm font-semibold text-text-primary">{stats.totalExercises}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-text-muted">Sets</span>
                        <span className="text-sm font-semibold text-text-primary">{stats.totalSets}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-text-muted">Volume</span>
                        <span className="text-sm font-semibold text-text-primary">{stats.totalVolume.toLocaleString()}kg</span>
                      </div>
                    </div>

                    {progress && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          progress.type === "increase"
                            ? "bg-accent-green/12 text-accent-green"
                            : progress.type === "decrease"
                              ? "bg-accent-red/12 text-accent-red"
                              : "bg-bg-input text-text-muted"
                        }`}
                      >
                        {progress.type === "increase" && "↑ "}
                        {progress.type === "decrease" && "↓ "}
                        {progress.type === "same" && "→ "}
                        {Math.abs(progress.volumePercent).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </button>

                {expanded && !isEditing && (
                  <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
                    {workout.exercises.map((exercise) => (
                      <ExerciseCard key={exercise.id} exercise={exercise} prevSets={getPrevExerciseSets(exercise.id, prev)} />
                    ))}
                    <button
                      onClick={() => startEdit(workout)}
                      className="mt-1 w-full rounded-lg bg-bg-input py-3 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card-hover"
                    >
                      Edit Workout
                    </button>
                  </div>
                )}

                {isEditing && (
                  <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
                    {editExercises.map((exercise, exIdx) => (
                      <div key={exercise.id} className="rounded-lg bg-bg-input px-4 py-3">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-text-primary">{exercise.name}</h3>
                          <button
                            onClick={() => handleEditRemoveExercise(exIdx)}
                            className="rounded-md px-2 py-1 text-xs text-accent-red transition-colors active:bg-accent-red/10"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem_1.75rem] items-center gap-1.5 text-[10px] font-medium tracking-wider text-text-muted uppercase">
                            <span>Set</span>
                            <span>Kg</span>
                            <span>Reps</span>
                            <span className="text-center">Fail</span>
                            <span />
                          </div>

                          {exercise.sets.map((set, setIdx) => (
                            <div key={setIdx} className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem_1.75rem] items-center gap-1.5">
                              <span className="text-center text-sm text-text-muted">{setIdx + 1}</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={set.weight || ""}
                                onChange={(e) => handleEditSetChange(exIdx, setIdx, "weight", parseFloat(e.target.value) || 0)}
                                className="h-10 min-w-0 rounded-lg bg-bg-card px-2 text-center text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent-red"
                                placeholder="0"
                              />
                              <input
                                type="number"
                                inputMode="numeric"
                                value={set.reps || ""}
                                onChange={(e) => handleEditSetChange(exIdx, setIdx, "reps", parseInt(e.target.value) || 0)}
                                className="h-10 min-w-0 rounded-lg bg-bg-card px-2 text-center text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent-red"
                                placeholder="0"
                              />
                              <button
                                onClick={() => handleEditSetChange(exIdx, setIdx, "toFailure", !set.toFailure)}
                                className={`h-10 rounded-lg text-xs font-medium transition-colors ${
                                  set.toFailure ? "bg-accent-red/15 text-accent-red" : "bg-bg-card text-text-muted"
                                }`}
                              >
                                {set.toFailure ? "Yes" : "No"}
                              </button>
                              <button
                                onClick={() => handleEditRemoveSet(exIdx, setIdx)}
                                className={`h-10 text-lg text-text-dim ${exercise.sets.length <= 1 ? "pointer-events-none opacity-20" : ""}`}
                              >
                                ×
                              </button>
                            </div>
                          ))}

                          <button
                            onClick={() => handleEditAddSet(exIdx)}
                            className="w-full rounded-lg bg-bg-card py-2.5 text-xs font-medium text-text-secondary transition-colors active:bg-bg-card-hover"
                          >
                            Add Set
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={cancelEdit} className="rounded-lg bg-bg-input py-3 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card-hover">
                        Cancel
                      </button>
                      <button onClick={saveEdit} className="rounded-lg bg-accent-red py-3 text-sm font-semibold text-white active:scale-[0.99]">
                        Save
                      </button>
                    </div>

                    {deleteConfirmId === workout.id ? (
                      <div className="flex flex-col gap-3 rounded-lg bg-accent-red/8 p-4">
                        <p className="text-xs text-text-secondary">Delete this workout permanently?</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleDeleteWorkout(workout.id)}
                            className="rounded-md bg-accent-red py-2.5 text-xs font-semibold text-white"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded-md bg-bg-input py-2.5 text-xs text-text-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(workout.id)}
                        className="w-full rounded-lg py-2.5 text-xs text-text-muted transition-colors active:text-accent-red"
                      >
                        Delete Workout
                      </button>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <section>
          {showClearConfirm ? (
            <div className="flex flex-col gap-4 rounded-xl bg-accent-red/8 p-5">
              <p className="text-sm text-text-secondary">Delete all workout history? This cannot be undone.</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    clearWorkouts();
                    setShowClearConfirm(false);
                  }}
                  className="rounded-md bg-accent-red py-3 text-sm font-semibold text-white"
                >
                  Delete
                </button>
                <button onClick={() => setShowClearConfirm(false)} className="rounded-md bg-bg-input py-3 text-sm text-text-secondary">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full rounded-lg bg-bg-card py-4 text-sm text-text-muted transition-colors active:bg-bg-card-hover"
            >
              Clear All Data
            </button>
          )}
        </section>
      )}
    </PageLayout>
  );
}

function ExerciseCard({ exercise, prevSets }: { exercise: ExerciseEntry; prevSets: SetEntry[] | null }) {
  if (exercise.sets.length === 0) {
    return (
      <div className="rounded-lg bg-bg-input px-4 py-2.5">
        <p className="text-xs text-text-muted">{exercise.name} — No sets logged</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-bg-input px-4 py-3">
      <h3 className="mb-2 text-sm font-semibold text-text-primary">{exercise.name}</h3>
      <div className="flex flex-col gap-2">
        {exercise.sets.map((set, idx) => {
          const prevSet = prevSets?.[idx] ?? null;
          const wDelta = prevSet ? set.weight - prevSet.weight : 0;
          const rDelta = prevSet ? set.reps - prevSet.reps : 0;

          return (
            <div key={idx} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2.5 text-sm">
                <span className="w-5 shrink-0 text-xs text-text-dim">#{idx + 1}</span>
                <span className="font-medium text-text-primary">{set.weight > 0 ? `${set.weight}kg` : "BW"}</span>
                {wDelta !== 0 ? (
                  <span className={`text-[10px] font-semibold ${wDelta > 0 ? "text-accent-green" : "text-accent-red"}`}>
                    {wDelta > 0 ? "+" : ""}
                    {wDelta}
                  </span>
                ) : prevSet ? (
                  <span className="text-[10px] font-semibold text-text-muted">=</span>
                ) : null}
                <span className="text-text-dim">×</span>
                <span className="font-medium text-text-primary">{set.reps}</span>
                {rDelta !== 0 ? (
                  <span className={`text-[10px] font-semibold ${rDelta > 0 ? "text-accent-green" : "text-accent-red"}`}>
                    {rDelta > 0 ? "+" : ""}
                    {rDelta}
                  </span>
                ) : prevSet ? (
                  <span className="text-[10px] font-semibold text-text-muted">=</span>
                ) : null}
                {set.toFailure && (
                  <span className="ml-auto rounded bg-accent-red/15 px-2 py-0.5 text-[10px] font-semibold text-accent-red">Failure</span>
                )}
              </div>
              {prevSet && (
                <span className="ml-7 text-[10px] text-text-dim">
                  prev: {prevSet.weight > 0 ? `${prevSet.weight}kg` : "BW"} × {prevSet.reps}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {!prevSets && <p className="mt-2 text-[10px] text-text-dim">First session</p>}
    </div>
  );
}
