import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getEffectiveExercise } from "../data/exercises";
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
    if (!day || day.type !== 'lift') return;
    if (activeWorkout && activeWorkout.dayId === dayId) return;
    if (activeWorkout) cancelWorkout();

    const exercises: ExerciseEntry[] = day.exercises.map((exerciseId) => {
      const exercise = getEffectiveExercise(exerciseId);
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
    const exercise = getEffectiveExercise(exerciseId);
    if (!exercise) return;
    const seconds = exercise.restSeconds || 120;
    timer.start(seconds, isSecondInSuperset(exerciseId) ? "Rest after superset" : "Rest");
  };

  if (!day) {
    return (
      <PageLayout withBottomNavPadding={false}>
        <div className="pt-20 text-center text-text-muted">Loading workout...</div>
      </PageLayout>
    );
  }

  if (day.type !== 'lift') {
    return (
      <PageLayout withBottomNavPadding={false} className="flex flex-col gap-6">
        <header className="flex items-start justify-between gap-4 pt-1">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium tracking-widest text-text-muted uppercase">{day.type}</p>
            <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-text-primary">{day.focus}</h1>
          </div>
        </header>

        <section className="flex flex-col gap-5 rounded-xl bg-bg-card p-6">
          {day.description && (
            <p className="text-sm leading-relaxed text-text-primary">{day.description}</p>
          )}
          {day.duration && (
            <div className="flex items-center gap-3 rounded-lg bg-bg-input px-4 py-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-accent-yellow">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span className="text-sm font-medium text-text-secondary">{day.duration}</span>
            </div>
          )}
          {day.tips && (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold tracking-widest text-text-secondary uppercase">Tips</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{day.tips}</p>
            </div>
          )}
        </section>

        <button
          onClick={() => navigate("/")}
          className="w-full rounded-lg bg-accent-red py-4 text-sm font-semibold tracking-wide text-white active:scale-[0.99]"
        >
          Done
        </button>
      </PageLayout>
    );
  }

  if (!activeWorkout) {
    return (
      <PageLayout withBottomNavPadding={false}>
        <div className="pt-20 text-center text-text-muted">Loading workout...</div>
      </PageLayout>
    );
  }

  return (
    <>
      {timer.isRunning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 px-5 backdrop-blur-sm">
          <div className="flex w-full max-w-[380px] flex-col gap-6 rounded-xl bg-bg-card p-6 text-center">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium tracking-widest text-text-muted uppercase">{timer.label}</p>
              <p className="font-[var(--font-display)] text-7xl leading-none text-text-primary">{timer.formatTime(timer.secondsLeft)}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {restPresets.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => timer.start(seconds, timer.label)}
                  className="rounded-md bg-bg-input px-3.5 py-2 text-sm text-text-secondary transition-colors active:bg-bg-card-hover"
                >
                  {seconds >= 60 ? `${seconds / 60}m` : `${seconds}s`}
                </button>
              ))}
            </div>

            <button
              onClick={timer.stop}
              className="w-full rounded-md bg-bg-input py-3.5 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card-hover"
            >
              Skip Rest
            </button>
          </div>
        </div>
      )}

      <PageLayout withBottomNavPadding={false} className="flex flex-col gap-6">
        <header className="flex items-start justify-between gap-4 pt-1">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium tracking-widest text-text-muted uppercase">{program.shortName}</p>
            <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-text-primary">{day.focus}</h1>
          </div>
          <button
            onClick={() => setShowCancel(true)}
            className="rounded-md bg-bg-input px-4 py-2 text-sm text-text-secondary transition-colors active:bg-bg-card-hover"
          >
            Cancel
          </button>
        </header>

        {showCancel && (
          <section className="flex flex-col gap-4 rounded-xl bg-accent-red/8 p-5">
            <p className="text-sm text-text-secondary">Cancel this workout? Logged sets from this session will be lost.</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={handleCancel} className="rounded-md bg-accent-red py-3 text-sm font-semibold text-white">
                Cancel Workout
              </button>
              <button
                onClick={() => setShowCancel(false)}
                className="rounded-md bg-bg-input py-3 text-sm font-medium text-text-secondary"
              >
                Keep Going
              </button>
            </div>
          </section>
        )}

        {activeWorkout.exercises.length === 0 && (
          <section className="rounded-xl bg-bg-card p-6 text-sm text-text-secondary">
            No lifting exercises for this day.
          </section>
        )}

        {activeWorkout.exercises.map((entry, exerciseIndex) => {
          const exercise = getEffectiveExercise(entry.id);
          if (!exercise) return null;

          const firstInSuperset = isFirstInSuperset(entry.id);
          const secondInSuperset = isSecondInSuperset(entry.id);
          const lastSets = getLastSets(entry.id, history);
          const suggestion = getOverloadSuggestion(exercise, lastSets);

          return (
            <section key={entry.id} className="flex flex-col gap-2.5">
              {firstInSuperset && <p className="px-0.5 text-xs font-semibold tracking-widest text-accent-yellow uppercase">Superset</p>}

              <div className="rounded-xl bg-bg-card px-5 py-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-lg font-semibold text-text-primary">{entry.name}</h2>
                    <p className="text-xs text-text-muted">
                      {exercise.equipment} · {exercise.repRange[0]}-{exercise.repRange[1]} reps
                    </p>
                  </div>

                  <div className={`rounded-lg px-4 py-2.5 text-xs leading-relaxed ${
                    suggestion.type === 'increase' ? 'bg-accent-green/10 text-accent-green' :
                    suggestion.type === 'decrease' ? 'bg-accent-orange/10 text-accent-orange' :
                    suggestion.type === 'testing' ? 'bg-accent-blue/10 text-accent-blue' :
                    'bg-bg-input text-text-secondary'
                  }`}>
                    <span className="font-semibold uppercase tracking-wider">
                      {suggestion.type === 'increase' ? 'Weight Up' :
                       suggestion.type === 'decrease' ? 'Weight Down' :
                       suggestion.type === 'testing' ? 'Testing' :
                       'Building Reps'}
                    </span>
                    <span className="mx-1.5 opacity-40">·</span>
                    {suggestion.message}
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem_1.75rem] items-center gap-1.5 text-[10px] font-medium tracking-wider text-text-muted uppercase">
                      <span>Set</span>
                      <span>Kg</span>
                      <span>Reps</span>
                      <span className="text-center">Fail</span>
                      <span />
                    </div>

                    {entry.sets.map((set, setIndex) => (
                      <div key={setIndex} className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem_1.75rem] items-center gap-1.5">
                        <span className="text-center text-sm text-text-muted">{setIndex + 1}</span>

                        <input
                          type="number"
                          inputMode="decimal"
                          value={set.weight || ""}
                          onChange={(event) => handleSetChange(exerciseIndex, setIndex, "weight", parseFloat(event.target.value) || 0)}
                          className="h-11 min-w-0 rounded-lg bg-bg-input px-2 text-center text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent-red"
                          placeholder="0"
                        />

                        <input
                          type="number"
                          inputMode="numeric"
                          value={set.reps || ""}
                          onChange={(event) => handleSetChange(exerciseIndex, setIndex, "reps", parseInt(event.target.value) || 0)}
                          className="h-11 min-w-0 rounded-lg bg-bg-input px-2 text-center text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent-red"
                          placeholder="0"
                        />

                        <button
                          onClick={() => handleSetChange(exerciseIndex, setIndex, "toFailure", !set.toFailure)}
                          className={`h-11 rounded-lg text-xs font-medium transition-colors ${
                            set.toFailure ? "bg-accent-red/15 text-accent-red" : "bg-bg-input text-text-muted"
                          }`}
                        >
                          {set.toFailure ? "Yes" : "No"}
                        </button>

                        <button
                          onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                          className={`h-11 text-lg text-text-dim ${entry.sets.length <= 1 ? "pointer-events-none opacity-20" : ""}`}
                          aria-label={`Remove set ${setIndex + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddSet(exerciseIndex)}
                      className="flex-1 rounded-lg bg-bg-input py-3 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card-hover"
                    >
                      Add Set
                    </button>

                    {exercise.restSeconds > 0 && !firstInSuperset && (
                      <button
                        onClick={() => handleRest(entry.id)}
                        className="rounded-lg bg-bg-input px-4 py-3 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card-hover"
                      >
                        Rest {exercise.restSeconds}s
                      </button>
                    )}

                    {secondInSuperset && (
                      <button
                        onClick={() => timer.start(120, "Rest after superset")}
                        className="rounded-lg bg-bg-input px-4 py-3 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card-hover"
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

        <button onClick={handleFinish} className="w-full rounded-lg bg-accent-red py-4 text-sm font-semibold tracking-wide text-white active:scale-[0.99]">
          Finish Workout
        </button>
      </PageLayout>
    </>
  );
}
