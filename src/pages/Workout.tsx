import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getEffectiveExercise, getEffectiveExercises, exerciseGroups } from "../data/exercises";
import { programs } from "../data/programs";
import { useTimer } from "../hooks/useTimer";
import { getOverloadSuggestion } from "../lib/overload";
import { useExerciseStore } from "../store/exerciseStore";
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
    finishWorkout,
    cancelWorkout,
    history,
  } = useWorkoutStore();
  const timer = useTimer();
  const [showCancel, setShowCancel] = useState(false);
  const [weightOverrides, setWeightOverrides] = useState<Record<string, boolean>>({});
  const [swapTarget, setSwapTarget] = useState<number | null>(null);
  const { weightMode, setWeightMode } = useExerciseStore();
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

  const isBodyweightMode = (exerciseId: string) => {
    if (weightOverrides[exerciseId] !== undefined) return !weightOverrides[exerciseId];
    const exercise = getEffectiveExercise(exerciseId);
    if (!exercise || exercise.equipment !== "bodyweight+") return false;
    const stored = weightMode[exerciseId];
    if (stored) return stored === "bodyweight";
    const last = getLastSets(exerciseId, history);
    if (last && last.some((s) => s.weight > 0)) return false;
    return true;
  };

  const toggleWeightMode = (exerciseId: string) => {
    const currentlyBodyweight = isBodyweightMode(exerciseId);
    setWeightOverrides((prev) => ({ ...prev, [exerciseId]: currentlyBodyweight }));
    setWeightMode(exerciseId, currentlyBodyweight ? "weighted" : "bodyweight");
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

        <section className="flex flex-col gap-5 rounded-xl bg-bg-card p-6">
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

  // Render a single exercise card
  const renderExerciseCard = (exerciseIndex: number, showRest: boolean) => {
    const entry = activeWorkout.exercises[exerciseIndex];
    if (!entry) return null;
    const exercise = getEffectiveExercise(entry.id);
    if (!exercise) return null;

    const lastSets = getLastSets(entry.id, history);
    const suggestion = getOverloadSuggestion(exercise, lastSets);
    const bwMode = isBodyweightMode(entry.id);
    const isBwExercise = exercise.equipment === "bodyweight+";
    const secondInSS = isSecondInSuperset(entry.id);
    const splitFirst = wasSplitFirst(entry.id);

    return (
      <div key={entry.id} className="rounded-xl bg-bg-card px-5 py-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-lg font-semibold text-text-primary">{entry.name}</h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-text-muted">
                  {exercise.equipment === "bodyweight+" ? "bodyweight" : exercise.equipment} · {exercise.repRange[0]}-{exercise.repRange[1]} reps
                </p>
                {isBwExercise && (
                  <button
                    onClick={() => toggleWeightMode(entry.id)}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                      bwMode ? "bg-bg-input text-text-muted" : "bg-accent-blue/12 text-accent-blue"
                    }`}
                  >
                    {bwMode ? "+ Add Weight" : "BW Only"}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setSwapTarget(exerciseIndex)}
              className="shrink-0 rounded-md bg-bg-input p-2 text-text-muted transition-colors active:bg-bg-card-hover"
              aria-label="Swap exercise"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          <div
            className={`rounded-lg px-4 py-2.5 text-xs leading-relaxed ${
              suggestion.type === "increase"
                ? "bg-accent-green/10 text-accent-green"
                : suggestion.type === "decrease"
                  ? "bg-accent-orange/10 text-accent-orange"
                  : suggestion.type === "testing"
                    ? "bg-accent-blue/10 text-accent-blue"
                    : "bg-bg-input text-text-secondary"
            }`}
          >
            <span className="font-semibold uppercase tracking-wider">
              {suggestion.type === "increase" ? (bwMode ? "Reps Maxed" : "Weight Up") : suggestion.type === "decrease" ? "Weight Down" : suggestion.type === "testing" ? "Testing" : "Building Reps"}
            </span>
            <span className="mx-1.5 opacity-40">·</span>
            {suggestion.message}
          </div>

          <div className="flex flex-col gap-2.5">
            {bwMode ? (
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_3rem_1.75rem] items-center gap-1.5 text-[10px] font-medium tracking-wider text-text-muted uppercase">
                <span>Set</span>
                <span>Reps</span>
                <span className="text-center">Fail</span>
                <span />
              </div>
            ) : (
              <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem_1.75rem] items-center gap-1.5 text-[10px] font-medium tracking-wider text-text-muted uppercase">
                <span>Set</span>
                <span>Kg</span>
                <span>Reps</span>
                <span className="text-center">Fail</span>
                <span />
              </div>
            )}

            {entry.sets.map((set, setIndex) =>
              bwMode ? (
                <div key={setIndex} className="grid grid-cols-[2rem_minmax(0,1fr)_3rem_1.75rem] items-center gap-1.5">
                  <span className="text-center text-sm text-text-muted">{setIndex + 1}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps || ""}
                    onChange={(e) => handleSetChange(exerciseIndex, setIndex, "reps", parseInt(e.target.value) || 0)}
                    className="h-11 min-w-0 rounded-lg bg-bg-input px-2 text-center text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent-red"
                    placeholder="0"
                  />
                  <button
                    onClick={() => handleSetChange(exerciseIndex, setIndex, "toFailure", !set.toFailure)}
                    className={`h-11 rounded-lg text-xs font-medium transition-colors ${set.toFailure ? "bg-accent-red/15 text-accent-red" : "bg-bg-input text-text-muted"}`}
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
              ) : (
                <div key={setIndex} className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_3rem_1.75rem] items-center gap-1.5">
                  <span className="text-center text-sm text-text-muted">{setIndex + 1}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={set.weight || ""}
                    onChange={(e) => handleSetChange(exerciseIndex, setIndex, "weight", parseFloat(e.target.value) || 0)}
                    className="h-11 min-w-0 rounded-lg bg-bg-input px-2 text-center text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent-red"
                    placeholder="0"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps || ""}
                    onChange={(e) => handleSetChange(exerciseIndex, setIndex, "reps", parseInt(e.target.value) || 0)}
                    className="h-11 min-w-0 rounded-lg bg-bg-input px-2 text-center text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent-red"
                    placeholder="0"
                  />
                  <button
                    onClick={() => handleSetChange(exerciseIndex, setIndex, "toFailure", !set.toFailure)}
                    className={`h-11 rounded-lg text-xs font-medium transition-colors ${set.toFailure ? "bg-accent-red/15 text-accent-red" : "bg-bg-input text-text-muted"}`}
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
              ),
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleAddSet(exerciseIndex)}
              className="flex-1 rounded-lg bg-bg-input py-3 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card-hover"
            >
              Add Set
            </button>

            {showRest && (exercise.restSeconds > 0 || splitFirst) && (
              <button
                onClick={() => handleRest(entry.id)}
                className="rounded-lg bg-bg-input px-4 py-3 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card-hover"
              >
                Rest {exercise.restSeconds || 60}s
              </button>
            )}

            {secondInSS && (
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
    );
  };

  return (
    <>
      {/* Rest Timer Modal */}
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
            <button onClick={timer.stop} className="w-full rounded-md bg-bg-input py-3.5 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card-hover">
              Skip Rest
            </button>
          </div>
        </div>
      )}

      {/* Swap Exercise Modal */}
      {swapTarget !== null && (
        <SwapModal
          currentExerciseId={activeWorkout.exercises[swapTarget]?.id ?? ""}
          activeExerciseIds={activeWorkout.exercises.map((e) => e.id)}
          onSelect={handleSwap}
          onClose={() => setSwapTarget(null)}
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
              <button onClick={() => setShowCancel(false)} className="rounded-md bg-bg-input py-3 text-sm font-medium text-text-secondary">
                Keep Going
              </button>
            </div>
          </section>
        )}

        {activeWorkout.exercises.length === 0 && (
          <section className="rounded-xl bg-bg-card p-6 text-sm text-text-secondary">No lifting exercises for this day.</section>
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

                <div className="flex flex-col gap-2.5 rounded-2xl border-l-[3px] border-accent-yellow/40 pl-2.5">
                  {renderExerciseCard(firstIdx, false)}
                  {renderExerciseCard(secondIdx, true)}
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
              {renderExerciseCard(group.index, true)}
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

// Swap Exercise Modal
function SwapModal({
  currentExerciseId,
  activeExerciseIds,
  onSelect,
  onClose,
}: {
  currentExerciseId: string;
  activeExerciseIds: string[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const allExercises = getEffectiveExercises();

  // All exercises except the current one and ones already in the workout
  const candidates = allExercises.filter((e) => {
    if (e.id === currentExerciseId) return false;
    if (activeExerciseIds.includes(e.id)) return false;
    return true;
  });

  // Group by muscle group
  const grouped: { label: string; exercises: Exercise[] }[] = [];
  for (const group of exerciseGroups) {
    const matches = candidates.filter((e) => e.primaryMuscles.some((m) => (group.muscles as readonly string[]).includes(m)));
    if (matches.length > 0) grouped.push({ label: group.label, exercises: matches });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <h2 className="font-[var(--font-display)] text-2xl text-text-primary">Swap Exercise</h2>
        <button onClick={onClose} className="rounded-md bg-bg-input px-4 py-2 text-sm text-text-secondary">
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {candidates.length === 0 ? (
          <p className="pt-8 text-center text-sm text-text-muted">No alternative exercises available.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(({ label, exercises }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">{label}</p>
                {exercises.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelect(e)}
                    className="flex flex-col gap-0.5 rounded-lg bg-bg-card px-4 py-3 text-left transition-colors active:bg-bg-card-hover"
                  >
                    <span className="text-sm font-medium text-text-primary">{e.name}</span>
                    <span className="text-xs text-text-muted">
                      {e.equipment === "bodyweight+" ? "bodyweight" : e.equipment} · {e.repRange[0]}-{e.repRange[1]} reps
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
