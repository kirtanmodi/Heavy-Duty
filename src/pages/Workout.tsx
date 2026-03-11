import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExerciseCard } from "../components/ExerciseCard";
import { ExercisePickerModal } from "../components/ExercisePickerModal";
import { PageLayout } from "../components/layout/PageLayout";
import { getEffectiveExercise } from "../data/exercises";
import { cardioActivities, programs } from "../data/programs";

import { useTimer } from "../hooks/useTimer";
import { createMentzerSets, getOverloadSuggestion } from "../lib/overload";
import { useSettingsStore } from "../store/settingsStore";
import { getLastSets, useWorkoutStore } from "../store/workoutStore";
import type { Exercise, ExerciseEntry, SetEntry } from "../types";

type ExerciseGroup =
  | { type: "single"; index: number }
  | { type: "superset"; indices: [number, number] };

const focusColors: Record<string, string> = {
  Push: "#E50914",
  Pull: "#4488FF",
  "Legs & Abs": "#FF8844",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${m}:00`;
}

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
    insertExerciseAtIndex,
    removeExerciseFromWorkout,
    skipExercise,
    unskipExercise,
    finishWorkout,
    cancelWorkout,
    history,
  } = useWorkoutStore();
  const timer = useTimer();
  const autoStartTimer = useSettingsStore((s) => s.autoStartTimer);

  const isOpen = dayId === "open";

  const [showCancel, setShowCancel] = useState(false);
  const [discardedConflict, setDiscardedConflict] = useState(false);
  const [swapTarget, setSwapTarget] = useState<number | null>(null);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(
    () => isOpen && (!activeWorkout || activeWorkout.exercises.length === 0),
  );
  const leavingRef = useRef(false);
  const restPresets = [60, 90, 120, 180, 300];
  const program = programs[0];
  const day = program.days.find((d) => d.id === dayId);
  const themeColor = isOpen ? "#FFAA00" : (focusColors[day?.focus ?? ""] ?? "#FFAA00");

  // Derive conflict: active workout exists for a different day
  const hasDayConflict = !!(activeWorkout && activeWorkout.dayId !== dayId && activeWorkout.dayId !== (isOpen ? "open" : dayId) && !discardedConflict);

  useEffect(() => {
    if (leavingRef.current) return;
    if (isOpen) {
      if (activeWorkout && activeWorkout.dayId === "open") return;
      if (activeWorkout) return; // conflict — handled by hasDayConflict UI
      startWorkout("open", "Open Workout", "Freeform", []);
      return;
    }

    if (!day || day.type !== "lift") return;
    if (activeWorkout && activeWorkout.dayId === dayId) return;
    if (activeWorkout) return; // conflict — handled by hasDayConflict UI

    const lastWorkoutForDay = history.find((w) => w.dayId === dayId);
    const exerciseIds = lastWorkoutForDay
      ? lastWorkoutForDay.exercises.map((e) => e.id)
      : day.exercises;

    const exercises: ExerciseEntry[] = exerciseIds.map((exerciseId) => {
      const exercise = getEffectiveExercise(exerciseId);
      if (!exercise) return { id: exerciseId, name: exerciseId, sets: [] };

      const lastSets = getLastSets(exerciseId, history);
      const suggestion = getOverloadSuggestion(exercise, lastSets);
      const sets = createMentzerSets(suggestion, exercise);

      return { id: exerciseId, name: exercise.name, sets };
    });

    startWorkout(day.id, day.name, program.name, exercises);
  }, [isOpen, activeWorkout, day, dayId, history, startWorkout, cancelWorkout, program.name]);

  // Derive active supersets (exclude split ones)
  const allSupersets = isOpen ? [] : (day?.supersets ?? []);
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

  // Progress calculation (exclude skipped exercises)
  const totalSets = activeWorkout?.exercises.filter(e => !e.skipped).reduce((sum, e) => sum + e.sets.length, 0) ?? 0;
  const completedSets = activeWorkout?.exercises.filter(e => !e.skipped).reduce(
    (sum, e) => sum + e.sets.filter((s) => s.weight > 0 || s.reps > 0).length,
    0,
  ) ?? 0;
  const progressPct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

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
    leavingRef.current = true;
    finishWorkout();
    navigate("/workout-summary");
  };

  const handleCancel = () => {
    leavingRef.current = true;
    cancelWorkout();
    navigate("/");
  };

  const handleRest = (exerciseId: string) => {
    const exercise = getEffectiveExercise(exerciseId);
    if (!exercise) return;
    const seconds = exercise.restSeconds || 120;
    timer.start(seconds, isSecondInSuperset(exerciseId) ? "Rest after superset" : "Rest");
  };

  const handleSetComplete = (exerciseIndex: number) => {
    if (!autoStartTimer || !activeWorkout || timer.isRunning) return;
    const entry = activeWorkout.exercises[exerciseIndex];
    if (!entry) return;

    // No auto-rest for first exercise in an active superset pair (rest comes after the second)
    const isFirstInSuperset = activeSupersets.some(([a]) => a === entry.id);
    if (isFirstInSuperset) return;

    const exercise = getEffectiveExercise(entry.id);
    if (!exercise) return;
    const seconds = exercise.restSeconds || 120;
    const label = isSecondInSuperset(entry.id) ? "Rest after superset" : "Rest";
    timer.start(seconds, label);
  };

  const handleMoveGroup = (groupIndex: number, direction: "up" | "down") => {
    if (!activeWorkout) return;
    const targetGroupIndex = direction === "up" ? groupIndex - 1 : groupIndex + 1;
    if (targetGroupIndex < 0 || targetGroupIndex >= groups.length) return;

    const exercises = [...activeWorkout.exercises];
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

  const handleSwap = (exercise: Exercise) => {
    if (swapTarget === null) return;
    const lastSets = getLastSets(exercise.id, history);
    const suggestion = getOverloadSuggestion(exercise, lastSets);
    const sets = createMentzerSets(suggestion, exercise);
    updateExercise(swapTarget, { id: exercise.id, name: exercise.name, sets });
    setSwapTarget(null);
  };

  const handleAddExercise = (exercise: Exercise) => {
    const lastSets = getLastSets(exercise.id, history);
    const suggestion = getOverloadSuggestion(exercise, lastSets);
    const sets = createMentzerSets(suggestion, exercise);
    addExerciseToWorkout({ id: exercise.id, name: exercise.name, sets });
    setShowAddExercise(false);
  };

  const handleInsertExercise = (exercise: Exercise) => {
    if (insertAtIndex === null) return;
    const lastSets = getLastSets(exercise.id, history);
    const suggestion = getOverloadSuggestion(exercise, lastSets);
    const sets = createMentzerSets(suggestion, exercise);
    insertExerciseAtIndex({ id: exercise.id, name: exercise.name, sets }, insertAtIndex);
    setInsertAtIndex(null);
  };

  const handleDiscardAndStart = () => {
    cancelWorkout();
    setDiscardedConflict(true);
  };

  if (!day && !isOpen) {
    return (
      <PageLayout withBottomNavPadding={false}>
        <div className="pt-20 text-center text-text-muted">Loading workout...</div>
      </PageLayout>
    );
  }

  if (!isOpen && day && day.type !== "lift") {
    const activities = cardioActivities[day.id] ?? [];

    return (
      <PageLayout withBottomNavPadding={false} className="flex flex-col gap-6">
        <header className="flex items-start justify-between gap-4 pt-1">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold tracking-widest text-text-dim uppercase">{day.type}</p>
            <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-text-primary">{day.focus}</h1>
          </div>
        </header>

        <section
          className="flex flex-col gap-5 overflow-hidden rounded-2xl p-6"
          style={{
            background: `linear-gradient(135deg, ${themeColor}08 0%, transparent 60%)`,
            border: `1px solid ${themeColor}15`,
          }}
        >
          {day.description && <p className="text-sm leading-relaxed text-text-secondary">{day.description}</p>}
          {day.duration && (
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" style={{ color: themeColor }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span className="text-sm font-medium text-text-secondary">{day.duration}</span>
            </div>
          )}
          {day.tips && (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-[10px] font-bold tracking-widest uppercase" style={{ color: themeColor }}>Tips</h3>
              <p className="text-sm leading-relaxed text-text-secondary">{day.tips}</p>
            </div>
          )}
        </section>

        {/* Activity suggestions */}
        {activities.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase">Pick an Activity</h2>
            <div className="flex flex-col gap-1.5">
              {activities.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl bg-bg-card px-4 py-3 card-surface"
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums"
                    style={{ background: `${themeColor}15`, color: themeColor }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-text-primary">{activity.name}</span>
                    <span className="text-xs leading-snug text-text-muted">{activity.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={() => navigate("/")}
          className="w-full rounded-2xl py-4 text-sm font-bold tracking-wide text-white transition-all active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)`,
            boxShadow: `0 4px 16px ${themeColor}30`,
          }}
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

  const buildCardProps = (exerciseIndex: number, showRest: boolean) => {
    const entry = activeWorkout.exercises[exerciseIndex];
    const exercise = entry ? getEffectiveExercise(entry.id) : null;
    const lastSets = exercise ? getLastSets(entry.id, history) : null;
    const suggestion = exercise ? getOverloadSuggestion(exercise, lastSets) : undefined;

    const restBtns: { label: string; onClick: () => void }[] = [];
    if (showRest && exercise && (exercise.restSeconds > 0 || wasSplitFirst(entry.id))) {
      restBtns.push({ label: `Rest ${formatDuration(exercise.restSeconds || 60)}`, onClick: () => handleRest(entry.id) });
    }
    if (entry && isSecondInSuperset(entry.id)) {
      restBtns.push({ label: "Rest 2:00", onClick: () => timer.start(120, "Rest after superset") });
    }

    return {
      entry,
      exerciseIndex,
      onSetChange: handleSetChange,
      onAddSet: handleAddSet,
      onRemoveSet: handleRemoveSet,
      onSwap: (idx: number) => setSwapTarget(idx),
      onRemove: (idx: number) => removeExerciseFromWorkout(idx),
      onSkip: (idx: number) => skipExercise(idx),
      onUnskip: (idx: number) => unskipExercise(idx),
      showOverloadBanner: true,
      overloadSuggestion: suggestion,
      restButtons: restBtns.length > 0 ? restBtns : undefined,
      previousSets: lastSets ?? undefined,
      onSetComplete: handleSetComplete,
    };
  };

  return (
    <>
      {/* Rest Timer Modal */}
      {timer.isRunning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5 animate-fade-in"
          style={{ background: "rgba(10,10,12,0.94)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
        >
          <div className="flex w-full max-w-[380px] flex-col items-center gap-8 animate-slide-up">
            {/* Timer ring */}
            <div className="relative flex h-52 w-52 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 208 208">
                <circle cx="104" cy="104" r="96" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                <circle
                  cx="104"
                  cy="104"
                  r="96"
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 96}
                  strokeDashoffset={2 * Math.PI * 96 * (1 - (timer.secondsLeft / (restPresets.find((p) => p >= timer.secondsLeft) ?? timer.secondsLeft + 1)))}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                  opacity="0.8"
                />
              </svg>
              <div className="flex flex-col items-center gap-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-dim">{timer.label}</p>
                <p className="font-[var(--font-display)] text-6xl leading-none text-text-primary tabular-nums">
                  {timer.formatTime(timer.secondsLeft)}
                </p>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap justify-center gap-2">
              {restPresets.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => timer.start(seconds, timer.label)}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm tabular-nums text-text-secondary transition-colors active:bg-white/[0.08]"
                >
                  {formatDuration(seconds)}
                </button>
              ))}
            </div>

            <button
              onClick={timer.stop}
              className="w-full max-w-[260px] rounded-2xl border border-white/[0.1] bg-transparent py-3.5 text-sm font-semibold text-text-secondary transition-colors active:bg-white/[0.04]"
            >
              Skip Rest
            </button>

            <button
              onClick={() => useSettingsStore.getState().setAutoStartTimer(!autoStartTimer)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] text-text-dim transition-colors active:bg-white/[0.04]"
            >
              <div
                className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${autoStartTimer ? "bg-accent-green/60" : "bg-white/[0.1]"}`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-white transition-transform ${autoStartTimer ? "translate-x-4" : "translate-x-0"}`}
                />
              </div>
              Auto-start timer
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
          onSelectWithAction={(exercise, action) => {
            if (action === "swap") {
              handleSwap(exercise);
            } else {
              handleAddExercise(exercise);
              setSwapTarget(null);
            }
          }}
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

      {/* Insert Exercise Modal */}
      {insertAtIndex !== null && (
        <ExercisePickerModal
          mode="add"
          activeExerciseIds={activeWorkout.exercises.map((e) => e.id)}
          onSelect={handleInsertExercise}
          onClose={() => setInsertAtIndex(null)}
        />
      )}

      <PageLayout withBottomNavPadding={false} className="flex flex-col gap-5 pb-28">
        {/* Header */}
        <header className="flex flex-col gap-3 pt-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold tracking-widest text-text-dim uppercase">{isOpen ? "Freeform" : program.shortName}</p>
              <h1 className="font-[var(--font-display)] text-[2.25rem] leading-none tracking-wider text-text-primary">
                {isOpen ? "Open Workout" : day!.focus}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCancel(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-text-dim transition-colors active:bg-white/[0.06]"
                aria-label="Cancel workout"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: themeColor }}
              />
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-text-dim">
              {completedSets}/{totalSets}
            </span>
          </div>
        </header>

        {/* Cancel confirmation */}
        {showCancel && (
          <section
            className="flex flex-col gap-4 rounded-2xl p-5 animate-slide-up"
            style={{ background: "rgba(229,9,20,0.06)", border: "1px solid rgba(229,9,20,0.12)" }}
          >
            <p className="text-sm text-text-secondary">What would you like to do?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowCancel(false)}
                className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.97]"
                style={{
                  background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)`,
                }}
              >
                Keep Going
              </button>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    leavingRef.current = true;
                    navigate("/");
                  }}
                  className="rounded-xl border border-white/[0.1] bg-transparent py-3 text-sm font-medium text-text-secondary transition-colors active:bg-white/[0.04]"
                >
                  Go to Home
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-xl border border-white/[0.1] bg-transparent py-3 text-sm font-medium text-accent-red transition-colors active:bg-white/[0.04]"
                >
                  Cancel Workout
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Day conflict dialog */}
        {hasDayConflict && activeWorkout && (
          <section
            className="flex flex-col gap-4 rounded-2xl p-5 animate-slide-up"
            style={{ background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.15)" }}
          >
            <div className="flex flex-col gap-1">
              <p className="text-sm text-text-secondary">You have a workout in progress:</p>
              <p className="text-base font-bold text-text-primary">{activeWorkout.dayName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => navigate(`/workout/${activeWorkout.dayId}`)}
                className="rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #46D369, #46D369CC)",
                }}
              >
                Resume
              </button>
              <button
                onClick={handleDiscardAndStart}
                className="rounded-xl border border-white/[0.1] bg-transparent py-3 text-sm font-medium text-accent-red transition-colors active:bg-white/[0.04]"
              >
                Discard & Start New
              </button>
            </div>
          </section>
        )}

        {activeWorkout.exercises.length === 0 && (
          <section className="rounded-2xl bg-white/[0.03] p-6 text-center text-sm text-text-secondary" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            {isOpen ? "Tap the button below to add your first exercise." : "No lifting exercises for this day."}
          </section>
        )}

        {/* Exercise groups with insert buttons */}
        {groups.map((group, groupIndex) => {
          const getInsertIdx = () => {
            if (groupIndex + 1 >= groups.length) return activeWorkout.exercises.length;
            const next = groups[groupIndex + 1];
            return next.type === "superset" ? next.indices[0] : next.index;
          };
          const isFirst = groupIndex === 0;
          const isLast = groupIndex === groups.length - 1;

          // Compute insert index: position of the first exercise in this group
          const groupStartIdx = group.type === "superset" ? group.indices[0] : group.index;

          const insertButton = (atIndex: number) => (
            <button
              onClick={() => setInsertAtIndex(atIndex)}
              className="group/insert flex w-full items-center gap-3 py-1"
              aria-label="Insert exercise here"
            >
              <div className="h-px flex-1 bg-white/[0.04] transition-colors group-active/insert:bg-white/[0.12]" />
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-white/[0.1] text-text-dim transition-colors group-active/insert:border-white/[0.2] group-active/insert:text-text-muted">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
                  <path d="M12 5v14m7-7H5" />
                </svg>
              </div>
              <div className="h-px flex-1 bg-white/[0.04] transition-colors group-active/insert:bg-white/[0.12]" />
            </button>
          );

          if (group.type === "superset") {
            const [firstIdx, secondIdx] = group.indices;
            const firstEntry = activeWorkout.exercises[firstIdx];
            return (
              <div key={`ss-${firstIdx}`} className="flex flex-col">
                {isFirst && insertButton(groupStartIdx)}
                <section className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-5 items-center gap-1 rounded-md bg-accent-yellow/12 px-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-accent-yellow">
                          <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-[10px] font-bold tracking-widest text-accent-yellow uppercase">Superset</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => splitSuperset(firstEntry.id)}
                        className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-text-dim transition-colors active:bg-white/[0.06]"
                      >
                        Split
                      </button>
                      <button
                        onClick={() => handleMoveGroup(groupIndex, "up")}
                        className={`rounded-lg p-2 text-text-dim transition-colors active:bg-white/[0.06] ${isFirst ? "pointer-events-none opacity-20" : ""}`}
                        aria-label="Move up"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                          <path d="M18 15l-6-6-6 6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveGroup(groupIndex, "down")}
                        className={`rounded-lg p-2 text-text-dim transition-colors active:bg-white/[0.06] ${isLast ? "pointer-events-none opacity-20" : ""}`}
                        aria-label="Move down"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div
                    className="flex flex-col gap-2.5 overflow-visible rounded-2xl pl-3"
                    style={{
                      borderLeft: "3px solid rgba(255, 170, 0, 0.3)",
                      background: "rgba(255, 170, 0, 0.02)",
                    }}
                  >
                    <ExerciseCard {...buildCardProps(firstIdx, false)} />
                    <ExerciseCard {...buildCardProps(secondIdx, true)} />
                  </div>
                </section>
                {insertButton(getInsertIdx())}
              </div>
            );
          }

          // Single exercise
          return (
            <div key={`s-${group.index}`} className="flex flex-col">
              {isFirst && insertButton(groupStartIdx)}
              <section className="flex flex-col gap-2">
                <div className="flex justify-end px-1">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleMoveGroup(groupIndex, "up")}
                      className={`rounded-lg p-2 text-text-dim transition-colors active:bg-white/[0.06] ${isFirst ? "pointer-events-none opacity-20" : ""}`}
                      aria-label="Move up"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveGroup(groupIndex, "down")}
                      className={`rounded-lg p-2 text-text-dim transition-colors active:bg-white/[0.06] ${isLast ? "pointer-events-none opacity-20" : ""}`}
                      aria-label="Move down"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <ExerciseCard {...buildCardProps(group.index, true)} />
              </section>
              {insertButton(getInsertIdx())}
            </div>
          );
        })}

        {/* Add exercise button */}
        <button
          onClick={() => setShowAddExercise(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.08] py-4 text-sm font-medium text-text-dim transition-colors active:bg-white/[0.03]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Exercise
        </button>
      </PageLayout>

      {/* Sticky Finish Bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-40"
        style={{
          background: "rgba(14,14,18,0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto flex max-w-[460px] items-center justify-between px-5 py-3">
          <span className="text-[13px] font-medium tabular-nums text-text-secondary">
            {completedSets}/{totalSets} sets
          </span>
          <button
            onClick={handleFinish}
            className="rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all active:scale-[0.97]"
            style={{
              background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)`,
              boxShadow: `0 4px 16px ${themeColor}25`,
            }}
          >
            Finish
          </button>
        </div>
      </div>
    </>
  );
}
