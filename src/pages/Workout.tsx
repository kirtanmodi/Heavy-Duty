import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExerciseCard } from "../components/ExerciseCard";
import { ExercisePickerModal } from "../components/ExercisePickerModal";
import { PageLayout } from "../components/layout/PageLayout";
import { getAutoReplacement, getEffectiveExercise } from "../data/exercises";
import { cardioActivities, programs } from "../data/programs";

import { useTimer } from "../hooks/useTimer";
import { curateWorkoutForFocus, getGymEquipmentOptionsForFocus } from "../lib/curatedWorkout";
import { formatDateKey, getIsoDateKey } from "../lib/dates";
import { createMentzerSets, getOverloadSuggestion } from "../lib/overload";
import { getMuscleRecoveryStatus, getGroupSkipHistory, muscleToGroup } from "../lib/recovery";
import { useSettingsStore } from "../store/settingsStore";
import { getLastSets, useWorkoutStore } from "../store/workoutStore";
import type { Exercise, ExerciseEntry, LiftFocus, ProgramDay, Program, SetEntry, WorkoutEntry } from "../types";

interface ExerciseGroup {
  index: number;
}

const focusColors: Record<string, string> = {
  Push: "#E50914",
  Pull: "#4488FF",
  "Legs & Abs": "#FF8844",
};

const dayTypeColors: Record<string, string> = {
  cardio: "#4488FF",
  recovery: "#4488FF",
  rest: "#46D369",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${m}:00`;
}

function isLiftFocus(focus: string): focus is LiftFocus {
  return focus === "Push" || focus === "Pull" || focus === "Legs & Abs";
}

function areSetsEqual(a: SetEntry[], b: SetEntry[]): boolean {
  return a.length === b.length && a.every((set, index) => {
    const other = b[index];
    return !!other
      && set.weight === other.weight
      && set.reps === other.reps
      && set.toFailure === other.toFailure
      && set.tempo === other.tempo;
  });
}

function CardioRecoveryView({
  day,
  program,
  themeColor,
  history,
}: {
  day: ProgramDay;
  program: Program;
  themeColor: string;
  history: WorkoutEntry[];
}) {
  const navigate = useNavigate();
  const activities = cardioActivities[day.id] ?? [];
  const todayDateKey = formatDateKey(new Date());
  const isDoneToday = history.some(
    (w) => getIsoDateKey(w.date) === todayDateKey,
  );
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  const handleMarkDone = () => {
    const didLog = useWorkoutStore.getState().logCardioSession(
      day.id,
      day.name,
      program.name,
      day.type,
      selectedActivity ?? undefined,
    );
    if (!didLog) {
      setLogError("This date already has a logged session.");
      return;
    }
    navigate("/");
  };

  return (
    <PageLayout withBottomNavPadding={false} className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4 pt-1">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-widest text-text-dim uppercase">{day.type}</p>
          <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-text-primary">{day.focus}</h1>
        </div>
        {isDoneToday && (
          <div className="flex items-center gap-1.5 rounded-full bg-accent-green/15 px-3 py-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 text-accent-green">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="text-[11px] font-semibold text-accent-green">Done Today</span>
          </div>
        )}
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

      {/* Activity suggestions — tap to select */}
      {activities.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[10px] font-bold tracking-widest text-text-muted uppercase">Pick an Activity</h2>
          <div className="flex flex-col gap-1.5">
            {activities.map((activity, idx) => {
              const isSelected = selectedActivity === activity.name;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedActivity(isSelected ? null : activity.name)}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                    isSelected
                      ? "ring-1"
                      : "bg-bg-card card-surface"
                  }`}
                  style={isSelected ? {
                    background: `${themeColor}10`,
                    border: `1px solid ${themeColor}40`,
                  } : undefined}
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tabular-nums"
                    style={{ background: `${themeColor}15`, color: themeColor }}
                  >
                    {isSelected ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-text-primary">{activity.name}</span>
                    <span className="text-xs leading-snug text-text-muted">{activity.note}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-2.5">
        {!isDoneToday && (
          <button
            onClick={handleMarkDone}
            className="w-full rounded-2xl py-4 text-sm font-bold tracking-wide text-white transition-all active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)`,
              boxShadow: `0 4px 16px ${themeColor}30`,
            }}
          >
            {selectedActivity ? `Done: ${selectedActivity}` : "Mark as Done"}
          </button>
        )}
        {logError && <p className="text-sm text-accent-orange">{logError}</p>}
        <button
          onClick={() => navigate("/")}
          className="w-full rounded-2xl border border-white/[0.1] bg-transparent py-3.5 text-sm font-medium text-text-secondary transition-colors active:bg-white/[0.04]"
        >
          Go Back
        </button>
      </div>
    </PageLayout>
  );
}

export function Workout() {
  const { dayId } = useParams<{ dayId: string }>();
  const navigate = useNavigate();
  const {
    activeWorkout,
    startWorkout,
    updateExercise,
    reorderExercises,
    replaceActiveWorkoutExercises,
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
  const gymEquipment = useSettingsStore((s) => s.gymEquipment);

  const isOpen = dayId === "open";

  const [showCancel, setShowCancel] = useState(false);
  const [discardedConflict, setDiscardedConflict] = useState(false);
  const [swapTarget, setSwapTarget] = useState<number | null>(null);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(
    () => isOpen && (!activeWorkout || activeWorkout.exercises.length === 0),
  );
  const [showWorkoutSetup, setShowWorkoutSetup] = useState(
    () => isOpen && (!activeWorkout || activeWorkout.exercises.length === 0),
  );
  const [showCoachingHints, setShowCoachingHints] = useState(false);
  const [showRecoveryActions, setShowRecoveryActions] = useState(false);
  const [curationFeedback, setCurationFeedback] = useState<string | null>(null);
  const [sessionSaveError, setSessionSaveError] = useState<string | null>(null);
  const [hasSessionSetInteraction, setHasSessionSetInteraction] = useState(false);
  const leavingRef = useRef(false);
  const sessionStartRef = useRef(activeWorkout?.startedAt);
  const restPresets = [60, 90, 120, 180, 300];
  const program = programs[0];
  const day = program.days.find((d) => d.id === dayId);
  const todayDateKey = formatDateKey(new Date());
  const todayHasCompletedSession = history.some((workout) => getIsoDateKey(workout.date) === todayDateKey);
  const themeColor = isOpen
    ? "#FFAA00"
    : day && day.type !== "lift"
      ? dayTypeColors[day.type] ?? "#FFAA00"
      : focusColors[day?.focus ?? ""] ?? "#FFAA00";
  const liftFocus = !isOpen && day?.type === "lift" && isLiftFocus(day.focus) ? day.focus : null;

  const seedExerciseEntry = useCallback((exerciseId: string): ExerciseEntry => {
    const exercise = getEffectiveExercise(exerciseId);
    if (!exercise) return { id: exerciseId, name: exerciseId, sets: [] };

    const lastSets = getLastSets(exerciseId, history);
    const suggestion = getOverloadSuggestion(exercise, lastSets);
    const sets = createMentzerSets(suggestion, exercise);

    return { id: exercise.id, name: exercise.name, sets };
  }, [history]);

  // Reset interaction flag when a new session starts
  if (activeWorkout?.startedAt !== sessionStartRef.current) {
    sessionStartRef.current = activeWorkout?.startedAt;
    setHasSessionSetInteraction(false);
  }

  // Derive conflict: active workout exists for a different day
  const hasDayConflict = !!(activeWorkout && activeWorkout.dayId !== dayId && activeWorkout.dayId !== (isOpen ? "open" : dayId) && !discardedConflict);

  useEffect(() => {
    if (leavingRef.current) return;
    if (isOpen) {
      if (activeWorkout && activeWorkout.dayId === "open") return;
      if (activeWorkout) return; // conflict — handled by hasDayConflict UI
      if (todayHasCompletedSession) return;
      startWorkout("open", "Open Workout", "Freeform", []);
      return;
    }

    if (!day || day.type !== "lift") return;
    if (activeWorkout && activeWorkout.dayId === dayId) return;
    if (activeWorkout) return; // conflict — handled by hasDayConflict UI
    if (todayHasCompletedSession) return;

    const lastWorkoutForDay = history.find((w) => w.dayId === dayId);
    const exerciseIds = lastWorkoutForDay
      ? lastWorkoutForDay.exercises.map((e) => e.id)
      : day.exercises;

    const exercises = exerciseIds.map(seedExerciseEntry);

    startWorkout(day.id, day.name, program.name, exercises);
  }, [isOpen, activeWorkout, day, dayId, history, startWorkout, cancelWorkout, program.name, seedExerciseEntry, todayHasCompletedSession]);

  // Build flat list of exercise groups (one per exercise)
  const buildGroups = (): ExerciseGroup[] => {
    if (!activeWorkout) return [];
    return activeWorkout.exercises.map((_, i) => ({ index: i }));
  };

  const groups = buildGroups();

  // Progress calculation (exclude skipped exercises)
  const activeExerciseCount = activeWorkout?.exercises.filter((exercise) => !exercise.skipped).length ?? 0;
  const totalSets = activeWorkout?.exercises.filter(e => !e.skipped).reduce((sum, e) => sum + e.sets.length, 0) ?? 0;
  const completedSets = activeWorkout?.exercises.filter(e => !e.skipped).reduce(
    (sum, e) => sum + e.sets.filter((s) => s.weight > 0 || s.reps > 0).length,
    0,
  ) ?? 0;
  const progressPct = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
  const hasPersistedSetChanges = useMemo(() => {
    if (!activeWorkout) return false;

    return activeWorkout.exercises.some((entry) => {
      const seededEntry = seedExerciseEntry(entry.id);
      return !areSetsEqual(entry.sets, seededEntry.sets);
    });
  }, [activeWorkout, seedExerciseEntry]);
  const hasLoggedSets = hasSessionSetInteraction || hasPersistedSetChanges;
  const gymEquipmentOptions = useMemo(
    () => (liftFocus ? getGymEquipmentOptionsForFocus(liftFocus) : []),
    [liftFocus],
  );
  const curatedResult = useMemo(
    () => (liftFocus ? curateWorkoutForFocus(liftFocus, gymEquipment) : null),
    [gymEquipment, liftFocus],
  );
  const curatedExerciseIds = curatedResult?.exerciseIds ?? [];
  const selectedEquipmentCount = gymEquipmentOptions.filter((option) => gymEquipment[option.id]).length;
  const { recoveringGroups, groupExerciseIndices, skipHistory } = useMemo(() => {
    const recoveryStatuses = getMuscleRecoveryStatus(history);
    const skipHistory = getGroupSkipHistory(history);
    const targetMuscles = new Set<string>();
    const groupExerciseIndices = new Map<string, number[]>();

    if (activeWorkout) {
      for (let i = 0; i < activeWorkout.exercises.length; i++) {
        const ex = activeWorkout.exercises[i];
        if (ex.skipped) continue;
        const def = getEffectiveExercise(ex.id);
        if (!def) continue;
        for (const m of def.primaryMuscles) {
          const group = muscleToGroup.get(m);
          if (!group) continue;
          targetMuscles.add(group);
          const indices = groupExerciseIndices.get(group) ?? [];
          if (!indices.includes(i)) indices.push(i);
          groupExerciseIndices.set(group, indices);
        }
      }
    }

    const recoveringGroups = recoveryStatuses.filter(
      (status) => targetMuscles.has(status.group) && status.status === "recovering" && status.daysSinceLastTrained !== null,
    );

    return { recoveringGroups, groupExerciseIndices, skipHistory };
  }, [activeWorkout, history]);

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: number | boolean) => {
    setHasSessionSetInteraction(true);
    const exercise = { ...activeWorkout!.exercises[exerciseIndex] };
    const sets = [...exercise.sets];
    sets[setIndex] = { ...sets[setIndex], [field]: value };
    updateExercise(exerciseIndex, { ...exercise, sets });
  };

  const handleAddSet = (exerciseIndex: number) => {
    setHasSessionSetInteraction(true);
    const exercise = { ...activeWorkout!.exercises[exerciseIndex] };
    const lastSet = exercise.sets[exercise.sets.length - 1];
    updateExercise(exerciseIndex, {
      ...exercise,
      sets: [...exercise.sets, { weight: lastSet?.weight ?? 0, reps: lastSet?.reps ?? 0, toFailure: false, tempo: "4-1-4" }],
    });
  };

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    setHasSessionSetInteraction(true);
    const exercise = { ...activeWorkout!.exercises[exerciseIndex] };
    if (exercise.sets.length <= 1) return;
    updateExercise(exerciseIndex, { ...exercise, sets: exercise.sets.filter((_, i) => i !== setIndex) });
  };

  const handleFinish = () => {
    const didFinish = finishWorkout();
    if (!didFinish) {
      setSessionSaveError("This date already has a logged session. Move or undo that day from the calendar first.");
      return;
    }
    leavingRef.current = true;
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
    timer.start(seconds, "Rest");
  };

  const handleSetComplete = (exerciseIndex: number) => {
    setHasSessionSetInteraction(true);
    if (!autoStartTimer || !activeWorkout || timer.isRunning) return;
    const entry = activeWorkout.exercises[exerciseIndex];
    if (!entry) return;

    const exercise = getEffectiveExercise(entry.id);
    if (!exercise) return;
    const seconds = exercise.restSeconds || 120;
    timer.start(seconds, "Rest");
  };

  const handleMoveGroup = (groupIndex: number, direction: "up" | "down") => {
    if (!activeWorkout) return;
    const targetGroupIndex = direction === "up" ? groupIndex - 1 : groupIndex + 1;
    if (targetGroupIndex < 0 || targetGroupIndex >= groups.length) return;

    const exercises = [...activeWorkout.exercises];
    const allGroupIndices = groups.map((g) => [g.index]);
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
    updateExercise(swapTarget, seedExerciseEntry(exercise.id));
    setSwapTarget(null);
  };

  const handleAutoReplace = (exerciseIndex: number) => {
    if (!activeWorkout) return;
    const current = activeWorkout.exercises[exerciseIndex];
    const excludeIds = activeWorkout.exercises.map((e) => e.id);
    const replacement = getAutoReplacement(current.id, excludeIds);
    if (replacement) {
      updateExercise(exerciseIndex, seedExerciseEntry(replacement.id));
    } else {
      setCurationFeedback("No alternative exercises available for this muscle group.");
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    addExerciseToWorkout(seedExerciseEntry(exercise.id));
    setShowAddExercise(false);
  };

  const handleInsertExercise = (exercise: Exercise) => {
    if (insertAtIndex === null) return;
    insertExerciseAtIndex(seedExerciseEntry(exercise.id), insertAtIndex);
    setInsertAtIndex(null);
  };

  const handleCurateWorkout = (shuffle = false) => {
    if (!activeWorkout || !liftFocus) return;

    if (hasLoggedSets) {
      setCurationFeedback("Curating is locked after you log a set so you do not overwrite workout data.");
      return;
    }

    const result = shuffle
      ? curateWorkoutForFocus(liftFocus, gymEquipment, {
          shuffle: true,
          avoid: activeWorkout.exercises.map((e) => e.id),
        })
      : curatedResult;

    if (!result || result.exerciseIds.length === 0) {
      setCurationFeedback("No matching exercises found. Turn on more equipment and try again.");
      return;
    }

    replaceActiveWorkoutExercises(result.exerciseIds.map(seedExerciseEntry));
    setShowWorkoutSetup(false);

    const skippedMsg = result.skippedSlots.length > 0
      ? ` Skipped: ${result.skippedSlots.join(", ")}.`
      : "";
    setCurationFeedback(
      shuffle
        ? `Shuffled ${liftFocus} workout — ${result.exerciseIds.length} exercises.${skippedMsg}`
        : `Built a ${liftFocus} workout with ${result.exerciseIds.length} exercises.${skippedMsg}`,
    );
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
    return <CardioRecoveryView day={day} program={program} themeColor={themeColor} history={history} />;
  }

  if (todayHasCompletedSession && !activeWorkout) {
    return (
      <PageLayout withBottomNavPadding={false}>
        <div className="flex flex-col gap-3 pt-20 text-center">
          <p className="text-base font-semibold text-text-primary">Today already has a logged session</p>
          <p className="px-6 text-sm leading-relaxed text-text-muted">
            One day can only hold one workout, cardio, or rest entry. Use the Home calendar to undo that day or move it.
          </p>
        </div>
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

  const buildCardProps = (exerciseIndex: number) => {
    const entry = activeWorkout.exercises[exerciseIndex];
    const exercise = entry ? getEffectiveExercise(entry.id) : null;
    const lastSets = exercise ? getLastSets(entry.id, history) : null;
    const suggestion = exercise ? getOverloadSuggestion(exercise, lastSets) : undefined;

    const restBtns: { label: string; onClick: () => void }[] = [];
    if (exercise && exercise.restSeconds > 0) {
      restBtns.push({ label: `Rest ${formatDuration(exercise.restSeconds || 60)}`, onClick: () => handleRest(entry.id) });
    }

    return {
      entry,
      exerciseIndex,
      onSetChange: handleSetChange,
      onAddSet: handleAddSet,
      onRemoveSet: handleRemoveSet,
      onSwap: (idx: number) => setSwapTarget(idx),
      onAutoReplace: handleAutoReplace,
      onRemove: (idx: number) => removeExerciseFromWorkout(idx),
      onSkip: (idx: number) => skipExercise(idx),
      onUnskip: (idx: number) => unskipExercise(idx),
      showOverloadBanner: showCoachingHints,
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

        <section className="surface-card-muted rounded-[1.55rem] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="section-label">Session</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {activeExerciseCount} exercise{activeExerciseCount !== 1 ? "s" : ""} · {completedSets}/{totalSets} sets logged
              </p>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">
                {showWorkoutSetup
                  ? "Setup tools are open below. Make your changes, then get back to logging."
                  : "Stay in logging mode unless you need to change the exercise list."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setShowWorkoutSetup((value) => !value)}
              className={`${showWorkoutSetup ? "btn-primary text-white" : "btn-secondary"} px-4 py-2.5 text-sm font-semibold`}
            >
              {showWorkoutSetup ? "Done Customizing" : "Customize Workout"}
            </button>
            <button
              onClick={() => setShowCoachingHints((value) => !value)}
              className="btn-ghost px-4 py-2.5 text-sm font-semibold"
            >
              {showCoachingHints ? "Hide Hints" : "Show Hints"}
            </button>
          </div>
        </section>

        {showWorkoutSetup && (
          <section
            className="flex flex-col gap-4 rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-bold tracking-wide text-text-primary">Workout Setup</h2>
              <p className="text-xs leading-relaxed text-text-muted">
                Add exercises, reorder cards, or rebuild this workout.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setShowAddExercise(true)}
                className="btn-secondary px-4 py-3 text-sm font-semibold"
              >
                Add Exercise
              </button>
              <button
                onClick={() => setShowWorkoutSetup(false)}
                className="btn-ghost px-4 py-3 text-sm font-semibold"
              >
                Done
              </button>
            </div>

            {liftFocus && (
              <div className="rounded-[1.3rem] border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-text-primary">Curate from My Gym</h3>
                  <p className="text-xs leading-relaxed text-text-muted">
                    Rebuild this workout from the equipment you have available.
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-dim">
                  <span className="rounded-full border border-white/[0.08] px-2.5 py-1">
                    {selectedEquipmentCount}/{gymEquipmentOptions.length} selected
                  </span>
                  <span className="rounded-full border border-white/[0.08] px-2.5 py-1">
                    {curatedExerciseIds.length} exercises matched
                  </span>
                  {hasLoggedSets && (
                    <span className="rounded-full border border-accent-yellow/25 px-2.5 py-1 text-accent-yellow">
                      Locked after first logged set
                    </span>
                  )}
                </div>

                {curatedResult && curatedResult.skippedSlots.length > 0 && !hasLoggedSets && (
                  <p className="mt-3 text-[11px] leading-relaxed text-accent-yellow">
                    Missing equipment for: {curatedResult.skippedSlots.join(", ")}
                  </p>
                )}

                {curationFeedback && <p className="mt-3 text-xs leading-relaxed text-text-secondary">{curationFeedback}</p>}

                <div className="mt-3 grid gap-2.5">
                  <button
                    onClick={() => handleCurateWorkout(false)}
                    disabled={hasLoggedSets || curatedExerciseIds.length === 0}
                    className="w-full rounded-2xl py-3 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                    style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}CC)`, boxShadow: `0 4px 16px ${themeColor}20` }}
                  >
                    Build Workout
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleCurateWorkout(true)}
                      disabled={hasLoggedSets || curatedExerciseIds.length === 0}
                      className="btn-ghost px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Shuffle
                    </button>
                    <button
                      onClick={() => navigate("/my-gym")}
                      className="btn-ghost px-4 py-3 text-sm font-medium"
                    >
                      My Gym
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {recoveringGroups.length > 0 && (
          <section
            className="flex flex-col gap-3 rounded-2xl px-4 py-3.5"
            style={{ background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.12)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-accent-yellow">
                    <path d="M12 9v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                  <span className="text-xs font-semibold text-accent-yellow">Recovery Notice</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {recoveringGroups.length === 1
                    ? `${recoveringGroups[0].group} was trained recently. Open options if you want to skip it today.`
                    : `${recoveringGroups.length} target muscle groups were trained recently. Open options if you want to skip any today.`}
                </p>
              </div>
              <button
                onClick={() => setShowRecoveryActions((value) => !value)}
                className="btn-ghost shrink-0 px-3 py-2 text-xs font-semibold"
              >
                {showRecoveryActions ? "Hide" : "Options"}
              </button>
            </div>

            {showRecoveryActions && recoveringGroups.map((groupStatus) => {
              const consecutiveSkips = skipHistory.get(groupStatus.group) ?? 0;
              const exerciseIndices = groupExerciseIndices.get(groupStatus.group) ?? [];
              const exerciseCount = exerciseIndices.length;

              return (
                <div key={groupStatus.group} className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
                  <p className="text-xs leading-relaxed text-text-secondary">
                    <span className="font-medium text-text-primary">{groupStatus.group}</span> was trained {groupStatus.daysSinceLastTrained}d ago. Heavy Duty usually works best with 4-7 days rest.
                  </p>

                  {consecutiveSkips >= 2 ? (
                    <p className="text-[11px] font-medium leading-snug text-accent-red">
                      {groupStatus.group} has been skipped {consecutiveSkips} sessions in a row. Train it today for balanced progress.
                    </p>
                  ) : consecutiveSkips === 1 ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] leading-snug text-accent-orange">
                        {groupStatus.group} was also skipped last session. Skipping again may slow progress.
                      </p>
                      <button
                        onClick={() => {
                          const sorted = [...exerciseIndices].sort((a, b) => b - a);
                          for (const idx of sorted) skipExercise(idx);
                        }}
                        className="self-start rounded-lg border border-accent-orange/25 bg-accent-orange/10 px-3 py-1.5 text-[11px] font-semibold text-accent-orange transition-colors active:bg-accent-orange/20"
                      >
                        Skip anyway ({exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""})
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const sorted = [...exerciseIndices].sort((a, b) => b - a);
                        for (const idx of sorted) skipExercise(idx);
                      }}
                      className="self-start rounded-lg border border-accent-yellow/25 bg-accent-yellow/10 px-3 py-1.5 text-[11px] font-semibold text-accent-yellow transition-colors active:bg-accent-yellow/20"
                    >
                      Skip {groupStatus.group} this week ({exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""})
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {activeWorkout.exercises.length === 0 && (
          <section className="rounded-2xl bg-white/[0.03] p-6 text-center text-sm text-text-secondary" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            {isOpen ? "Add your first exercise to start logging." : "No lift exercises are loaded for this day."}
          </section>
        )}

        {/* Exercise groups with insert buttons */}
        {groups.map((group, groupIndex) => {
          const getInsertIdx = () => {
            if (groupIndex + 1 >= groups.length) return activeWorkout.exercises.length;
            return groups[groupIndex + 1].index;
          };
          const isFirst = groupIndex === 0;
          const isLast = groupIndex === groups.length - 1;

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

          return (
            <div key={`s-${group.index}`} className="flex flex-col">
              {showWorkoutSetup && isFirst && insertButton(group.index)}
              <section className="flex flex-col gap-2">
                {showWorkoutSetup && (
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
                )}
                <ExerciseCard {...buildCardProps(group.index)} />
              </section>
              {showWorkoutSetup && insertButton(getInsertIdx())}
            </div>
          );
        })}

        {/* Add exercise button */}
        {showWorkoutSetup && (
          <button
            onClick={() => setShowAddExercise(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.08] py-4 text-sm font-medium text-text-dim transition-colors active:bg-white/[0.03]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Exercise
          </button>
        )}
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
        <div className="mx-auto flex max-w-[460px] flex-col gap-2 px-5 py-3">
          {sessionSaveError && <p className="text-sm text-accent-orange">{sessionSaveError}</p>}
          <div className="flex items-center justify-between">
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
      </div>
    </>
  );
}
