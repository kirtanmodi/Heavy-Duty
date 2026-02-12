import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { useWorkoutStore } from "../store/workoutStore";

export function History() {
  const navigate = useNavigate();
  const history = useWorkoutStore((s) => s.history);
  const clearWorkouts = useWorkoutStore((s) => s.clearAll);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
          {history.map((workout) => (
            <section key={workout.id} className="overflow-hidden rounded-xl bg-bg-card">
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-base font-semibold text-text-primary">{workout.day}</h2>
                  <p className="text-xs text-text-muted">
                    {new Date(workout.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="rounded bg-bg-input px-2.5 py-1 text-xs text-text-muted">
                  {workout.program}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-bg-input/40 text-left">
                      <th className="px-5 py-2 text-[10px] font-medium tracking-wider text-text-muted uppercase">Exercise</th>
                      <th className="px-3 py-2 text-center text-[10px] font-medium tracking-wider text-text-muted uppercase">Set</th>
                      <th className="px-3 py-2 text-center text-[10px] font-medium tracking-wider text-text-muted uppercase">Weight</th>
                      <th className="px-3 py-2 text-center text-[10px] font-medium tracking-wider text-text-muted uppercase">Reps</th>
                      <th className="px-5 py-2 text-center text-[10px] font-medium tracking-wider text-text-muted uppercase">Fail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workout.exercises.map((exercise, exerciseIdx) =>
                      exercise.sets.length > 0 ? (
                        exercise.sets.map((set, setIdx) => (
                          <tr
                            key={`${exercise.id}-${setIdx}`}
                            className={`${
                              exerciseIdx < workout.exercises.length - 1 && setIdx === exercise.sets.length - 1
                                ? "border-b border-border"
                                : ""
                            }`}
                          >
                            {setIdx === 0 && (
                              <td rowSpan={exercise.sets.length} className="px-5 py-2.5 align-top">
                                <span className="text-sm font-medium text-text-primary">
                                  {exercise.name}
                                </span>
                              </td>
                            )}
                            <td className="px-3 py-2 text-center text-xs text-text-muted">{setIdx + 1}</td>
                            <td className="px-3 py-2 text-center text-sm text-text-primary">{set.weight}kg</td>
                            <td className="px-3 py-2 text-center text-sm text-text-primary">{set.reps}</td>
                            <td className="px-5 py-2 text-center">
                              {set.toFailure ? (
                                <span className="inline-block rounded bg-accent-red/15 px-2 py-0.5 text-[10px] font-semibold text-accent-red">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-xs text-text-dim">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr key={exercise.id} className={exerciseIdx < workout.exercises.length - 1 ? "border-b border-border" : ""}>
                          <td className="px-5 py-2.5">
                            <span className="text-sm font-medium text-text-primary">
                              {exercise.name}
                            </span>
                          </td>
                          <td colSpan={4} className="px-3 py-2.5 text-center text-xs text-text-muted">No sets logged</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
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
