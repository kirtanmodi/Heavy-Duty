import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { useWorkoutStore } from "../store/workoutStore";

export function History() {
  const navigate = useNavigate();
  const history = useWorkoutStore((s) => s.history);

  return (
    <PageLayout className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 pt-2">
        <h1 className="font-[var(--font-display)] text-4xl leading-none text-text-primary">Workout History</h1>
        <p className="text-base leading-relaxed text-text-secondary">
          {history.length} workout{history.length !== 1 ? "s" : ""} logged
        </p>
      </header>

      {history.length === 0 ? (
        <section className="rounded-2xl border border-border-card bg-bg-card p-8 text-center">
          <p className="text-lg font-medium text-text-primary">No workouts yet</p>
          <p className="mt-4 text-base leading-relaxed text-text-muted">Complete your first workout and it will show up here.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-7 rounded-xl bg-accent-red px-6 py-4 text-base font-semibold text-white active:scale-[0.99]"
          >
            Start Training
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-5">
          {history.map((workout) => (
            <section key={workout.id} className="rounded-2xl border border-border-card bg-bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-[var(--font-display)] text-2xl leading-tight text-text-primary">{workout.day}</h2>
                  <p className="mt-2 text-sm text-text-muted">
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

              <div className="mt-6 flex flex-col gap-4">
                {workout.exercises.map((exercise) => (
                  <div key={exercise.id} className="rounded-xl bg-bg-input p-4">
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => navigate(`/exercise/${exercise.id}`)}
                        className="text-base font-medium text-text-primary active:text-accent-red"
                      >
                        {exercise.name}
                      </button>
                      <div className="flex flex-wrap gap-2.5">
                        {exercise.sets.map((set, i) => (
                          <span key={i} className="rounded-full border border-border-card bg-bg-card px-3 py-1.5 text-sm text-text-secondary">
                            {set.weight}kg x {set.reps}
                            {set.toFailure ? " fail" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
