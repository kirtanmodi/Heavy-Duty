import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { useWorkoutStore } from "../store/workoutStore";
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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const toggleSession = (id: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

      {history.length === 0 ? (
        <section className="flex flex-col items-center gap-6 rounded-xl bg-bg-card p-8 text-center">
          <div className="flex flex-col gap-2">
            <p className="text-base font-medium text-text-primary">No workouts yet</p>
            <p className="text-sm text-text-muted">Complete your first workout and it will show up here.</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="rounded-md bg-accent-red px-8 py-3 text-sm font-semibold text-white active:scale-[0.99]"
          >
            Start Training
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((workout) => {
            const expanded = expandedSessions.has(workout.id);
            const stats = calcStats(workout);
            const prev = findPrevSession(workout, history);
            const progress = calcProgress(workout, prev);

            return (
              <section key={workout.id} className="overflow-hidden rounded-xl bg-bg-card">
                <button
                  onClick={() => toggleSession(workout.id)}
                  className="w-full text-left"
                >
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

                {expanded && (
                  <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
                    {workout.exercises.map((exercise) => (
                      <ExerciseCard
                        key={exercise.id}
                        exercise={exercise}
                        prevSets={getPrevExerciseSets(exercise.id, prev)}
                      />
                    ))}
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
              <p className="text-sm text-text-secondary">
                Delete all workout history? This cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => { clearWorkouts(); setShowClearConfirm(false); }}
                  className="rounded-md bg-accent-red py-3 text-sm font-semibold text-white"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-md bg-bg-input py-3 text-sm text-text-secondary"
                >
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
      <div className="flex flex-col gap-1.5">
        {exercise.sets.map((set, idx) => {
          const prevSet = prevSets?.[idx] ?? null;
          const wDelta = prevSet ? set.weight - prevSet.weight : 0;
          const rDelta = prevSet ? set.reps - prevSet.reps : 0;

          return (
            <div key={idx} className="flex items-center gap-2.5 text-sm">
              <span className="w-5 shrink-0 text-xs text-text-dim">#{idx + 1}</span>
              <span className="font-medium text-text-primary">{set.weight}kg</span>
              {wDelta !== 0 && (
                <span className={`text-[10px] font-semibold ${wDelta > 0 ? "text-accent-green" : "text-accent-red"}`}>
                  {wDelta > 0 ? "+" : ""}{wDelta}
                </span>
              )}
              <span className="text-text-dim">×</span>
              <span className="font-medium text-text-primary">{set.reps}</span>
              {rDelta !== 0 && (
                <span className={`text-[10px] font-semibold ${rDelta > 0 ? "text-accent-green" : "text-accent-red"}`}>
                  {rDelta > 0 ? "+" : ""}{rDelta}
                </span>
              )}
              {set.toFailure && (
                <span className="ml-auto rounded bg-accent-red/15 px-2 py-0.5 text-[10px] font-semibold text-accent-red">
                  Failure
                </span>
              )}
            </div>
          );
        })}
      </div>
      {!prevSets && (
        <p className="mt-2 text-[10px] text-text-dim">First session</p>
      )}
    </div>
  );
}
