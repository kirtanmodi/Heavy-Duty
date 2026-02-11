import { useNavigate, useParams } from "react-router-dom";
import { MuscleMap } from "../components/anatomy/MuscleMap";
import { PageLayout } from "../components/layout/PageLayout";
import { getExercise, muscleColors, muscleGroupLabels } from "../data/exercises";
import { useOverload } from "../hooks/useOverload";
import { getExerciseHistory, useWorkoutStore } from "../store/workoutStore";
import type { Exercise } from "../types";

const overloadColors: Record<string, string> = {
  testing: "border-accent-blue/30 bg-accent-blue/5 text-accent-blue",
  increase: "border-accent-green/30 bg-accent-green/5 text-accent-green",
  maintain: "border-accent-yellow/30 bg-accent-yellow/5 text-accent-yellow",
  decrease: "border-accent-red/30 bg-accent-red/5 text-accent-red",
};

function ExerciseDetailContent({ exercise }: { exercise: Exercise }) {
  const navigate = useNavigate();
  const history = useWorkoutStore((s) => s.history);
  const suggestion = useOverload(exercise);
  const exerciseHistory = getExerciseHistory(exercise.id, history);
  const pairedExercise = exercise.supersetWith ? getExercise(exercise.supersetWith) : null;

  return (
    <PageLayout className="flex flex-col gap-8">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center rounded-full border border-border bg-bg-input px-4 py-2.5 text-sm text-text-secondary active:bg-bg-card"
      >
        Back
      </button>

      <header className="flex flex-col gap-3 pt-1">
        <h1 className="font-[var(--font-display)] text-4xl leading-none text-text-primary">{exercise.name}</h1>
        <p className="text-base text-text-muted">
          {exercise.equipment} · {exercise.type}
        </p>
      </header>

      <section className="rounded-2xl border border-border-card bg-bg-card p-6">
        <div className="flex flex-col gap-5">
          <div className="flex justify-center">
            <MuscleMap primaryMuscles={exercise.primaryMuscles} secondaryMuscles={exercise.secondaryMuscles} size="large" />
          </div>

          <div className="flex flex-wrap gap-2.5">
            {exercise.primaryMuscles.map((muscle) => (
              <span
                key={muscle}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
                style={{ backgroundColor: `${muscleColors[muscle]}20`, color: muscleColors[muscle] }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: muscleColors[muscle] }} />
                {muscleGroupLabels[muscle] || muscle}
              </span>
            ))}
            {exercise.secondaryMuscles.map((muscle) => (
              <span key={muscle} className="rounded-full border border-border bg-bg-input px-3 py-1.5 text-sm text-text-muted">
                {muscleGroupLabels[muscle] || muscle}
              </span>
            ))}
          </div>
        </div>
      </section>

      {pairedExercise && (
        <section className="rounded-2xl border border-accent-yellow/25 bg-accent-yellow/5 p-6">
          <p className="text-xs font-semibold tracking-wide text-accent-yellow">Superset Pairing</p>
          <p className="mt-2 text-base leading-relaxed text-text-secondary">
            Perform with <span className="font-semibold text-text-primary">{pairedExercise.name}</span> and keep rest minimal between movements.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-border-card bg-bg-card p-6">
        <div className="flex flex-col gap-5">
          <h2 className="text-base font-semibold text-text-secondary">Protocol</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-bg-input p-4">
              <p className="text-xs text-text-muted">Tempo</p>
              <p className="mt-2 text-xl font-semibold text-text-primary">4-1-4</p>
            </div>
            <div className="rounded-xl bg-bg-input p-4">
              <p className="text-xs text-text-muted">Sets</p>
              <p className="mt-2 text-xl font-semibold text-text-primary">2</p>
            </div>
            <div className="rounded-xl bg-bg-input p-4">
              <p className="text-xs text-text-muted">Rep range</p>
              <p className="mt-2 text-xl font-semibold text-text-primary">
                {exercise.repRange[0]}-{exercise.repRange[1]}
              </p>
            </div>
            <div className="rounded-xl bg-bg-input p-4">
              <p className="text-xs text-text-muted">Rest</p>
              <p className="mt-2 text-xl font-semibold text-text-primary">{exercise.restSeconds === 0 ? "Superset" : `${exercise.restSeconds}s`}</p>
            </div>
          </div>
          <p className="text-base leading-relaxed text-text-secondary">{exercise.mentzerTips}</p>
        </div>
      </section>

      <section className={`rounded-2xl border p-6 ${overloadColors[suggestion.type]}`}>
        <p className="text-xs font-semibold tracking-wide">Progressive Overload</p>
        <p className="mt-2 text-base leading-relaxed">{suggestion.message}</p>
      </section>

      <section>
        <h2 className="mb-4 text-base font-medium text-text-secondary">Recent Sessions</h2>
        {exerciseHistory.length === 0 ? (
          <div className="rounded-2xl border border-border-card bg-bg-card p-6 text-center text-base text-text-muted">
            No previous sessions logged.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {exerciseHistory.map((workout) => {
              const entry = workout.exercises.find((e) => e.id === exercise.id);
              if (!entry) return null;

              return (
                <div key={workout.id} className="rounded-2xl border border-border-card bg-bg-card p-6">
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-text-muted">
                      {new Date(workout.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {entry.sets.map((set, i) => (
                        <span key={i} className="rounded-full border border-border bg-bg-input px-3 py-1.5 text-sm text-text-secondary">
                          {set.weight}kg x {set.reps}
                          {set.toFailure ? " fail" : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageLayout>
  );
}

export function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const exercise = id ? getExercise(id) : undefined;

  if (!exercise) {
    return (
      <PageLayout>
        <div className="pt-20 text-center text-text-muted">Exercise not found</div>
      </PageLayout>
    );
  }

  return <ExerciseDetailContent exercise={exercise} />;
}
