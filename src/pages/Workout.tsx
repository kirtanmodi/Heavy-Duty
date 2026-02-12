import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getExercise } from "../data/exercises";
import { programs } from "../data/programs";
import { useTimer } from "../hooks/useTimer";
import { getOverloadSuggestion } from "../lib/overload";
import { getLastSets, useWorkoutStore } from "../store/workoutStore";
import type { ExerciseEntry, SetEntry } from "../types";

export function Workout() {
  const { dayId } = useParams<{ dayId: string }>();
  const navigate = useNavigate();
  const { activeWorkout, startWorkout, updateExercise, finishWorkout, cancelWorkout, history } = useWorkoutStore();
  const timer = useTimer();
  const [showCancel, setShowCancel] = useState(false);
  const restPresets = [60, 90, 120, 180, 300];

  const program = programs[0];
  const day = program.days.find((d) => d.id === dayId);

  useEffect(() => {
    if (!day) return;
    if (activeWorkout && activeWorkout.dayId === dayId) return;
    if (activeWorkout) cancelWorkout();

    const exercises: ExerciseEntry[] = day.exercises.map((exerciseId) => {
      const exercise = getExercise(exerciseId);
      if (!exercise) return { id: exerciseId, name: exerciseId, sets: [] };

      const lastSets = getLastSets(exerciseId, history);
      const suggestion = getOverloadSuggestion(exercise, lastSets);
      const sets: SetEntry[] = Array.from({ length: 2 }, () => ({
        weight: suggestion.suggestedWeight ?? 0,
        reps: suggestion.suggestedReps,
        toFailure: false,
        tempo: "4-1-4",
      }));

      return { id: exerciseId, name: exercise.name, sets };
    });

    startWorkout(day.id, day.name, program.name, exercises);
  }, [activeWorkout, day, dayId, history, startWorkout, cancelWorkout, program.name]);

  const supersets = day?.supersets ?? [];
  const isFirstInSuperset = (exerciseId: string) => supersets.some(([a]) => a === exerciseId);
  const isSecondInSuperset = (exerciseId: string) => supersets.some(([, b]) => b === exerciseId);

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: number | boolean) => {
    const exercise = { ...activeWorkout!.exercises[exerciseIndex] };
    const sets = [...exercise.sets];
    sets[setIndex] = { ...sets[setIndex], [field]: value };
    updateExercise(exerciseIndex, { ...exercise, sets });
  };

  const handleAddSet = (exerciseIndex: number) => {
    const exercise = { ...activeWorkout!.exercises[exerciseIndex] };
    const lastSet = exercise.sets[exercise.sets.length - 1];
    updateExercise(exerciseIndex, {
      ...exercise,
      sets: [...exercise.sets, { weight: lastSet?.weight ?? 0, reps: lastSet?.reps ?? 0, toFailure: false, tempo: "4-1-4" }],
    });
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    const exercise = { ...activeWorkout!.exercises[exerciseIndex] };
    if (exercise.sets.length <= 1) return;
    updateExercise(exerciseIndex, { ...exercise, sets: exercise.sets.filter((_, i) => i !== setIndex) });
  };

  const handleFinish = () => {
    finishWorkout();
    navigate("/");
  };

  const handleCancel = () => {
    cancelWorkout();
    navigate("/");
  };

  const handleRest = (exerciseId: string) => {
    const exercise = getExercise(exerciseId);
    if (!exercise) return;
    const seconds = exercise.restSeconds || 120;
    timer.start(seconds, isSecondInSuperset(exerciseId) ? "Rest after superset" : "Rest");
  };

  if (!day || !activeWorkout) {
    return (
      <PageLayout withBottomNavPadding={false}>
        <div className="pt-20 text-center text-text-muted">Loading workout...</div>
      </PageLayout>
    );
  }

  return (
    <>
      {timer.isRunning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/95 px-5 backdrop-blur-sm">
          <div className="flex w-full max-w-[380px] flex-col gap-6 rounded-2xl border border-border-card bg-bg-card p-6 text-center">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium tracking-wide text-text-muted">{timer.label}</p>
              <p className="font-[var(--font-display)] text-6xl leading-none text-text-primary">{timer.formatTime(timer.secondsLeft)}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2.5">
              {restPresets.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => timer.start(seconds, timer.label)}
                  className="rounded-full border border-border bg-bg-input px-3.5 py-2 text-sm text-text-secondary"
                >
                  {seconds >= 60 ? `${seconds / 60}m` : `${seconds}s`}
                </button>
              ))}
            </div>

            <button
              onClick={timer.stop}
              className="w-full rounded-xl border border-border bg-bg-input py-3.5 text-base font-medium text-text-secondary"
            >
              Skip Rest
            </button>
          </div>
        </div>
      )}

      <PageLayout withBottomNavPadding={false} className="flex flex-col gap-7">
        <header className="flex items-start justify-between gap-4 pt-1">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium tracking-wide text-text-muted">{program.shortName}</p>
            <h1 className="font-[var(--font-display)] text-4xl leading-[1.08] text-text-primary">{day.focus}</h1>
          </div>
          <button
            onClick={() => setShowCancel(true)}
            className="rounded-full border border-border bg-bg-input px-4 py-2.5 text-sm text-text-secondary"
          >
            Cancel
          </button>
        </header>

        {showCancel && (
          <section className="flex flex-col gap-4 rounded-2xl border border-accent-red/30 bg-accent-red/5 p-6">
            <p className="text-base text-text-secondary">Cancel this workout? Logged sets from this session will be lost.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleCancel} className="rounded-xl bg-accent-red py-3.5 text-base font-semibold text-white">
                Cancel Workout
              </button>
              <button
                onClick={() => setShowCancel(false)}
                className="rounded-xl border border-border bg-bg-input py-3.5 text-base font-medium text-text-secondary"
              >
                Keep Going
              </button>
            </div>
          </section>
        )}

        {activeWorkout.exercises.length === 0 && (
          <section className="rounded-2xl border border-border-card bg-bg-card p-6 text-base text-text-secondary">
            No lifting exercises for this day.
          </section>
        )}

        {activeWorkout.exercises.map((entry, exerciseIndex) => {
          const exercise = getExercise(entry.id);
          if (!exercise) return null;

          const firstInSuperset = isFirstInSuperset(entry.id);
          const secondInSuperset = isSecondInSuperset(entry.id);
          const lastSets = getLastSets(entry.id, history);
          const suggestion = getOverloadSuggestion(exercise, lastSets);

          return (
            <section key={entry.id} className="flex flex-col gap-3">
              {firstInSuperset && <p className="px-1 text-sm font-medium tracking-wide text-accent-yellow">Superset block</p>}

              <div className="rounded-2xl border border-border-card bg-bg-card px-5 py-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-semibold leading-tight text-text-primary">{entry.name}</h2>
                    <p className="text-sm text-text-muted">
                      {exercise.equipment} · {exercise.repRange[0]}-{exercise.repRange[1]} reps
                    </p>
                  </div>

                  <p className="rounded-xl bg-bg-input px-4 py-3 text-sm text-text-secondary">{suggestion.message}</p>

                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem_1.75rem] items-center gap-1.5 text-xs text-text-muted">
                      <span>Set</span>
                      <span>Kg</span>
                      <span>Reps</span>
                      <span className="text-center">Fail</span>
                      <span />
                    </div>

                    {entry.sets.map((set, setIndex) => (
                      <div key={setIndex} className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem_1.75rem] items-center gap-1.5">
                        <span className="text-center text-base text-text-muted">{setIndex + 1}</span>

                        <input
                          type="number"
                          inputMode="decimal"
                          value={set.weight || ""}
                          onChange={(event) => handleSetChange(exerciseIndex, setIndex, "weight", parseFloat(event.target.value) || 0)}
                          className="h-11 min-w-0 rounded-xl border border-border bg-bg-input px-2 text-center text-base text-text-primary outline-none focus:border-accent-red"
                          placeholder="0"
                        />

                        <input
                          type="number"
                          inputMode="numeric"
                          value={set.reps || ""}
                          onChange={(event) => handleSetChange(exerciseIndex, setIndex, "reps", parseInt(event.target.value) || 0)}
                          className="h-11 min-w-0 rounded-xl border border-border bg-bg-input px-2 text-center text-base text-text-primary outline-none focus:border-accent-red"
                          placeholder="0"
                        />

                        <button
                          onClick={() => handleSetChange(exerciseIndex, setIndex, "toFailure", !set.toFailure)}
                          className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                            set.toFailure ? "border-accent-red bg-accent-red/12 text-accent-red" : "border-border bg-bg-input text-text-muted"
                          }`}
                        >
                          {set.toFailure ? "Yes" : "No"}
                        </button>

                        <button
                          onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                          className={`h-11 text-xl text-text-dim ${entry.sets.length <= 1 ? "pointer-events-none opacity-20" : ""}`}
                          aria-label={`Remove set ${setIndex + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleAddSet(exerciseIndex)}
                      className="flex-1 rounded-xl border border-border bg-bg-input py-3 text-base font-medium text-text-secondary"
                    >
                      Add Set
                    </button>

                    {exercise.restSeconds > 0 && !firstInSuperset && (
                      <button
                        onClick={() => handleRest(entry.id)}
                        className="rounded-xl border border-border bg-bg-input px-4 py-3 text-base font-medium text-text-secondary"
                      >
                        Rest {exercise.restSeconds}s
                      </button>
                    )}

                    {secondInSuperset && (
                      <button
                        onClick={() => timer.start(120, "Rest after superset")}
                        className="rounded-xl border border-border bg-bg-input px-4 py-3 text-base font-medium text-text-secondary"
                      >
                        Rest 2m
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        <button onClick={handleFinish} className="w-full rounded-xl bg-accent-red py-4 text-base font-semibold text-white active:scale-[0.99]">
          Finish Workout
        </button>
      </PageLayout>
    </>
  );
}
