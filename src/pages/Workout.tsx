import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExerciseCard } from "../components/ExerciseCard";
import { ExercisePickerModal } from "../components/ExercisePickerModal";
import { PageLayout } from "../components/layout/PageLayout";
import { getEffectiveExercise } from "../data/exercises";
import { programs } from "../data/programs";
import { useTimer } from "../hooks/useTimer";
import { getOverloadSuggestion } from "../lib/overload";
import { getLastSets, useWorkoutStore } from "../store/workoutStore";
import type { Exercise, ExerciseEntry, SetEntry } from "../types";

type ExerciseGroup =
  | { type: "single"; index: number }
  | { type: "superset"; indices: [number, number] };

export function Workout() {
  const { dayId } = useParams<{ dayId: string }>();
  const navigate = useNavigate();
  const {
    activeWorkout,
    startWorkout,
    updateExercise,
    reorderExercises,
    splitSuperset,
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    finishWorkout,
    cancelWorkout,
    history,
  } = useWorkoutStore();
  const timer = useTimer();
  const [showCancel, setShowCancel] = useState(false);
  const [swapTarget, setSwapTarget] = useState<number | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const restPresets = [60, 90, 120, 180, 300];

  const program = programs[0];
  const day = program.days.find((d) => d.id === dayId);

  useEffect(() => {
    if (!day || day.type !== "lift") return;
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

  // Derive active supersets (exclude split ones)
  const allSupersets = day?.supersets ?? [];
  const splitIds = new Set(activeWorkout?.splitSupersets ?? []);
  const activeSupersets = allSupersets.filter(([a]) => !splitIds.has(a));

  const isSecondInSuperset = (id: string) => activeSupersets.some(([, b]) => b === id);
  const wasSplitFirst = (id: string) => allSupersets.some(([a]) => a === id) && splitIds.has(id);

  // Group exercises into singles and superset pairs
  const buildGroups = (): ExerciseGroup[] => {
    if (!activeWorkout) return [];
    const groups: ExerciseGroup[] = [];
    const handled = new Set<number>();

    for (let i = 0; i < activeWorkout.exercises.length; i++) {
      if (handled.has(i)) continue;
      const entry = activeWorkout.exercises[i];
      const pair = activeSupersets.find(([a]) => a === entry.id);
      if (pair) {
        const partnerIdx = activeWorkout.exercises.findIndex((e) => e.id === pair[1]);
        if (partnerIdx !== -1 && !handled.has(partnerIdx)) {
          groups.push({ type: "superset", indices: [i, partnerIdx] });
          handled.add(i);
          handled.add(partnerIdx);
          continue;
        }
      }
      const pair2 = activeSupersets.find(([, b]) => b === entry.id);
      if (pair2) {
        const firstIdx = activeWorkout.exercises.findIndex((e) => e.id === pair2[0]);
        if (firstIdx !== -1 && !handled.has(firstIdx)) {
          groups.push({ type: "superset", indices: [firstIdx, i] });
          handled.add(firstIdx);
          handled.add(i);
          continue;
        }
      }
      groups.push({ type: "single", index: i });
      handled.add(i);
    }
    return groups;
  };

  const groups = buildGroups();

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

  // Reorder: move a group up or down
  const handleMoveGroup = (groupIndex: number, direction: "up" | "down") => {
    if (!activeWorkout) return;
    const targetGroupIndex = direction === "up" ? groupIndex - 1 : groupIndex + 1;
    if (targetGroupIndex < 0 || targetGroupIndex >= groups.length) return;

    const exercises = [...activeWorkout.exercises];

    // Build new order
    const allGroupIndices = groups.map((g) => (g.type === "superset" ? [...g.indices] : [g.index]));
    const temp = allGroupIndices[groupIndex];
    allGroupIndices[groupIndex] = allGroupIndices[targetGroupIndex];
    allGroupIndices[targetGroupIndex] = temp;

    const newExercises: ExerciseEntry[] = [];
    for (const indices of allGroupIndices) {
      for (const idx of indices) {
        newExercises.push(exercises[idx]);
      }
    }
    reorderExercises(newExercises);
  };

  // Swap: replace exercise at index with a new one
  const handleSwap = (exercise: Exercise) => {
    if (swapTarget === null) return;
    const lastSets = getLastSets(exercise.id, history);
    const suggestion = getOverloadSuggestion(exercise, lastSets);
    const sets: SetEntry[] = Array.from({ length: 2 }, () => ({
      weight: suggestion.suggestedWeight ?? 0,
      reps: suggestion.suggestedReps,
      toFailure: false,
      tempo: "4-1-4",
    }));
    updateExercise(swapTarget, { id: exercise.id, name: exercise.name, sets });
    setSwapTarget(null);
  };

  const handleAddExercise = (exercise: Exercise) => {
    const lastSets = getLastSets(exercise.id, history);
    const suggestion = getOverloadSuggestion(exercise, lastSets);
    const sets: SetEntry[] = Array.from({ length: 2 }, () => ({
      weight: suggestion.suggestedWeight ?? 0,
      reps: suggestion.suggestedReps,
      toFailure: false,
      tempo: "4-1-4",
    }));
    addExerciseToWorkout({ id: exercise.id, name: exercise.name, sets });
    setShowAddExercise(false);
  };

  if (!day) {
    return (
      <PageLayout withBottomNavPadding={false}>
        <div className="pt-20 text-center text-text-muted">Loading workout...</div>
      </PageLayout>
    );
  }

  if (day.type !== "lift") {
    return (
      <PageLayout withBottomNavPadding={false} className="flex flex-col gap-6">
        <header className="flex items-start justify-between gap-4 pt-1">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium tracking-widest text-text-muted uppercase">{day.type}</p>
            <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-text-primary">{day.focus}</h1>
          </div>
        </header>

        <section className="flex flex-col gap-5 rounded-[14px] bg-bg-card card-surface p-6">
          {day.description && <p className="text-sm leading-relaxed text-text-primary">{day.description}</p>}
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
          className="w-full rounded-[14px] btn-primary py-4 text-sm font-semibold tracking-wide text-white"
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

  // Build props for shared ExerciseCard component
  const buildCardProps = (exerciseIndex: number, showRest: boolean) => {
    const entry = activeWorkout.exercises[exerciseIndex];
    const exercise = entry ? getEffectiveExercise(entry.id) : null;
    const lastSets = exercise ? getLastSets(entry.id, history) : null;
    const suggestion = exercise ? getOverloadSuggestion(exercise, lastSets) : undefined;

    const restBtns: { label: string; onClick: () => void }[] = [];
    if (showRest && exercise && (exercise.restSeconds > 0 || wasSplitFirst(entry.id))) {
      restBtns.push({ label: `Rest ${exercise.restSeconds || 60}s`, onClick: () => handleRest(entry.id) });
    }
    if (entry && isSecondInSuperset(entry.id)) {
      restBtns.push({ label: "Rest 2m", onClick: () => timer.start(120, "Rest after superset") });
    }

    return {
      entry,
      exerciseIndex,
      onSetChange: handleSetChange,
      onAddSet: handleAddSet,
      onRemoveSet: handleRemoveSet,
      onSwap: (idx: number) => setSwapTarget(idx),
      onRemove: (idx: number) => removeExerciseFromWorkout(idx),
      showOverloadBanner: true,
      overloadSuggestion: suggestion,
      restButtons: restBtns.length > 0 ? restBtns : undefined,
    };
  };

  return (
    <>
      {/* Rest Timer Modal */}
      {timer.isRunning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5 animate-fade-in" style={{ background: 'rgba(10,10,12,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <div className="flex w-full max-w-[380px] flex-col gap-6 rounded-[16px] bg-bg-card card-surface p-6 text-center animate-slide-up">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium tracking-widest text-text-muted uppercase">{timer.label}</p>
              <p className="font-[var(--font-display)] text-7xl leading-none text-text-primary tabular-nums">{timer.formatTime(timer.secondsLeft)}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {restPresets.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => timer.start(seconds, timer.label)}
                  className="rounded-[8px] border border-border-card bg-bg-input px-3.5 py-2 text-sm text-text-secondary transition-colors active:bg-bg-card-hover"
                >
                  {seconds >= 60 ? `${seconds / 60}m` : `${seconds}s`}
                </button>
              ))}
            </div>
            <button onClick={timer.stop} className="w-full rounded-[10px] btn-ghost py-3.5 text-sm font-medium transition-colors">
              Skip Rest
            </button>
          </div>
        </div>
      )}

      {/* Swap Exercise Modal */}
      {swapTarget !== null && (
        <ExercisePickerModal
          mode="swap"
          currentExerciseId={activeWorkout.exercises[swapTarget]?.id ?? ""}
          activeExerciseIds={activeWorkout.exercises.map((e) => e.id)}
          onSelect={handleSwap}
          onClose={() => setSwapTarget(null)}
        />
      )}

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <ExercisePickerModal
          mode="add"
          activeExerciseIds={activeWorkout.exercises.map((e) => e.id)}
          onSelect={handleAddExercise}
          onClose={() => setShowAddExercise(false)}
        />
      )}

      <PageLayout withBottomNavPadding={false} className="flex flex-col gap-6">
        <header className="flex items-start justify-between gap-4 pt-1">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium tracking-widest text-text-muted uppercase">{program.shortName}</p>
            <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-text-primary">{day.focus}</h1>
          </div>
          <button
            onClick={() => setShowCancel(true)}
            className="rounded-[8px] btn-ghost px-4 py-2 text-sm transition-colors"
          >
            Cancel
          </button>
        </header>

        {showCancel && (
          <section className="flex flex-col gap-4 rounded-[14px] border border-accent-red/15 bg-accent-red/8 p-5">
            <p className="text-sm text-text-secondary">Cancel this workout? Logged sets from this session will be lost.</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={handleCancel} className="rounded-[10px] btn-primary py-3 text-sm font-semibold text-white">
                Cancel Workout
              </button>
              <button onClick={() => setShowCancel(false)} className="rounded-[10px] btn-ghost py-3 text-sm font-medium">
                Keep Going
              </button>
            </div>
          </section>
        )}

        {activeWorkout.exercises.length === 0 && (
          <section className="rounded-[14px] bg-bg-card card-surface p-6 text-sm text-text-secondary">No lifting exercises for this day.</section>
        )}

        {groups.map((group, groupIndex) => {
          const isFirst = groupIndex === 0;
          const isLast = groupIndex === groups.length - 1;

          if (group.type === "superset") {
            const [firstIdx, secondIdx] = group.indices;
            const firstEntry = activeWorkout.exercises[firstIdx];
            return (
              <section key={`ss-${firstIdx}`} className="flex flex-col gap-2">
                {/* Reorder arrows */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold tracking-widest text-accent-yellow uppercase">Superset</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => splitSuperset(firstEntry.id)}
                      className="rounded-md px-2.5 py-1 text-[11px] font-medium text-text-muted transition-colors active:bg-bg-input"
                    >
                      Split
                    </button>
                    <button
                      onClick={() => handleMoveGroup(groupIndex, "up")}
                      className={`rounded-md p-1.5 text-text-muted transition-colors active:bg-bg-input ${isFirst ? "pointer-events-none opacity-20" : ""}`}
                      aria-label="Move up"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveGroup(groupIndex, "down")}
                      className={`rounded-md p-1.5 text-text-muted transition-colors active:bg-bg-input ${isLast ? "pointer-events-none opacity-20" : ""}`}
                      aria-label="Move down"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 rounded-[16px] border-l-[3px] border-accent-yellow/40 pl-2.5">
                  <ExerciseCard {...buildCardProps(firstIdx, false)} />
                  <ExerciseCard {...buildCardProps(secondIdx, true)} />
                </div>
              </section>
            );
          }

          // Single exercise
          return (
            <section key={`s-${group.index}`} className="flex flex-col gap-2">
              <div className="flex justify-end px-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveGroup(groupIndex, "up")}
                    className={`rounded-md p-1.5 text-text-muted transition-colors active:bg-bg-input ${isFirst ? "pointer-events-none opacity-20" : ""}`}
                    aria-label="Move up"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveGroup(groupIndex, "down")}
                    className={`rounded-md p-1.5 text-text-muted transition-colors active:bg-bg-input ${isLast ? "pointer-events-none opacity-20" : ""}`}
                    aria-label="Move down"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>
              </div>
              <ExerciseCard {...buildCardProps(group.index, true)} />
            </section>
          );
        })}

        <button
          onClick={() => setShowAddExercise(true)}
          className="w-full rounded-[14px] border border-dashed border-border py-4 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card"
        >
          + Add Exercise
        </button>

        <button onClick={handleFinish} className="w-full rounded-[14px] btn-primary py-4 text-sm font-semibold tracking-wide text-white">
          Finish Workout
        </button>
      </PageLayout>
    </>
  );
}
