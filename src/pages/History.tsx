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
    <PageLayout className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 pt-2">
        <h1 className="font-[var(--font-display)] text-4xl leading-none text-text-primary">Workout History</h1>
        <p className="text-base leading-relaxed text-text-secondary">
          {history.length} workout{history.length !== 1 ? "s" : ""} logged
        </p>
      </header>

      {history.length === 0 ? (
        <section className="flex flex-col gap-7 rounded-2xl border border-border-card bg-bg-card p-8 text-center">
          <div className="flex flex-col gap-4">
            <p className="text-lg font-medium text-text-primary">No workouts yet</p>
            <p className="text-base leading-relaxed text-text-muted">Complete your first workout and it will show up here.</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="rounded-xl bg-accent-red px-6 py-4 text-base font-semibold text-white active:scale-[0.99]"
          >
            Start Training
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-6">
          {history.map((workout) => (
            <section key={workout.id} className="overflow-hidden rounded-2xl border border-border-card bg-bg-card">
              <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-text-primary">{workout.day}</h2>
                  <p className="text-sm text-text-muted">
                    {new Date(workout.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="rounded-full border border-border bg-bg-input px-3 py-1.5 text-sm text-text-muted">
                  {workout.program}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-bg-input/50 text-left">
                      <th className="px-5 py-2.5 text-sm font-medium text-text-muted">Exercise</th>
                      <th className="px-3 py-2.5 text-center text-sm font-medium text-text-muted">Set</th>
                      <th className="px-3 py-2.5 text-center text-sm font-medium text-text-muted">Weight</th>
                      <th className="px-3 py-2.5 text-center text-sm font-medium text-text-muted">Reps</th>
                      <th className="px-5 py-2.5 text-center text-sm font-medium text-text-muted">Fail</th>
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
                                <span className="text-base font-medium text-text-primary">
                                  {exercise.name}
                                </span>
                              </td>
                            )}
                            <td className="px-3 py-2.5 text-center text-sm text-text-muted">{setIdx + 1}</td>
                            <td className="px-3 py-2.5 text-center text-base text-text-primary">{set.weight}kg</td>
                            <td className="px-3 py-2.5 text-center text-base text-text-primary">{set.reps}</td>
                            <td className="px-5 py-2.5 text-center">
                              {set.toFailure ? (
                                <span className="inline-block rounded-full bg-accent-red/12 px-2.5 py-1 text-xs font-medium text-accent-red">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-sm text-text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr key={exercise.id} className={exerciseIdx < workout.exercises.length - 1 ? "border-b border-border" : ""}>
                          <td className="px-5 py-2.5">
                            <span className="text-base font-medium text-text-primary">
                              {exercise.name}
                            </span>
                          </td>
                          <td colSpan={4} className="px-3 py-2.5 text-center text-sm text-text-muted">No sets logged</td>
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
            <div className="flex flex-col gap-5 rounded-2xl border border-accent-red/25 bg-accent-red/5 p-6">
              <p className="text-base leading-relaxed text-text-secondary">
                Delete all workout history? This cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { clearWorkouts(); setShowClearConfirm(false); }}
                  className="rounded-xl bg-accent-red py-4 text-base font-semibold text-white"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-xl border border-border bg-bg-input py-4 text-base text-text-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full rounded-xl border border-border-card bg-bg-card px-6 py-4 text-base text-text-muted"
            >
              Clear All Data
            </button>
          )}
        </section>
      )}
    </PageLayout>
  );
}
