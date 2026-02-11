import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { exerciseGroups, getExercisesByGroup } from "../data/exercises";

export function ExerciseLibrary() {
  const navigate = useNavigate();

  return (
    <PageLayout className="space-y-8">
      <header className="space-y-3 pt-2">
        <h1 className="font-[var(--font-display)] text-4xl leading-none text-text-primary">Exercise Library</h1>
        <p className="text-base leading-relaxed text-text-secondary">Exercises grouped by target area.</p>
      </header>

      {exerciseGroups.map((group) => {
        const exercises = getExercisesByGroup(group.label);
        if (exercises.length === 0) return null;

        return (
          <section key={group.label} className="rounded-2xl border border-border-card bg-bg-card p-6">
            <h2 className="text-base font-medium text-text-secondary">{group.label}</h2>
            <div className="mt-3 space-y-2">
              {exercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => navigate(`/exercise/${exercise.id}`)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-4 text-left active:bg-bg-input"
                >
                  <span className="space-y-1">
                    <span className="block text-base font-medium leading-tight text-text-primary">{exercise.name}</span>
                    <span className="block text-sm text-text-muted">
                      {exercise.equipment} · {exercise.repRange[0]}-{exercise.repRange[1]} reps
                    </span>
                  </span>
                  <span className="text-lg text-text-dim">›</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </PageLayout>
  );
}
