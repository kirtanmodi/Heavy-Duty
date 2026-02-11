import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { exerciseGroups, getExercisesByGroup } from "../data/exercises";

export function ExerciseLibrary() {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-4 pt-2">
          <h1 className="font-[var(--font-display)] text-4xl leading-none text-text-primary">Exercise Library</h1>
          <p className="text-base leading-relaxed text-text-secondary">Exercises grouped by target area.</p>
        </header>

        <div className="flex flex-col gap-8">
          {exerciseGroups.map((group) => {
            const exercises = getExercisesByGroup(group.label);
            if (exercises.length === 0) return null;

            return (
      <section key={group.label} className="rounded-2xl border border-border-card bg-bg-card p-8">
        <div className="flex flex-col gap-5">
          <h2 className="text-base font-medium text-text-secondary">{group.label}</h2>
          <div className="flex flex-col gap-2">
                  {exercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => navigate(`/exercise/${exercise.id}`)}
                      className="flex w-full items-center justify-between gap-4 rounded-xl px-6 py-5 text-left active:bg-bg-input"
                    >
                      <span className="min-w-0 flex flex-col gap-1">
                        <span className="block text-base font-medium leading-tight text-text-primary">{exercise.name}</span>
                        <span className="block text-sm text-text-muted">
                          {exercise.equipment} · {exercise.repRange[0]}-{exercise.repRange[1]} reps
                        </span>
                      </span>
                      <span className="shrink-0 text-lg text-text-dim">›</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
