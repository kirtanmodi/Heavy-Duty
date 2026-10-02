import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExerciseCard } from "../components/ExerciseCard";
import { ExercisePickerModal } from "../components/ExercisePickerModal";
import { PageLayout } from "../components/layout/PageLayout";
import { getAutoReplacement, getEffectiveExercise } from "../data/exercises";
import { cardioActivities, getDefaultExerciseIds, programs } from "../data/programs";

import { useElapsedTimer } from "../hooks/useElapsedTimer";
import { useTimer } from "../hooks/useTimer";
import { curateWorkoutForFocus, getGymEquipmentOptionsForFocus } from "../lib/curatedWorkout";
import { formatDateKey, getIsoDateKey } from "../lib/dates";
import { backOffSetsByOneStep, createMentzerSets, getOverloadSuggestion, needsWarmUpSet } from "../lib/overload";
import { getMuscleRecoveryStatus, getGroupSkipHistory, muscleToGroup } from "../lib/recovery";
import { useExerciseStore } from "../store/exerciseStore";
import { useSettingsStore } from "../store/settingsStore";
import { getDaysSinceExercise, getLastSets, getRecentSessionSets, useWorkoutStore } from "../store/workoutStore";
import type { Exercise, ExerciseEntry, LiftFocus, ProgramDay, Program, SetEntry, WorkoutEntry } from "../types";

interface ExerciseGroup {
  index: number;
}

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

/** iOS-style switch visual. The parent button owns role="switch" + aria-checked. */
function SwitchIndicator({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-[26px] w-[44px] shrink-0 items-center rounded-full p-[2px] transition-colors ${
        on ? "bg-accent-green" : "bg-fill-strong"
      }`}
    >
      <span
        className={`h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-0"
        }`}
      />
    </span>
  );
}

/** Isolated so only this text re-renders every second, not the whole workout page. */
function ElapsedTime({ startedAt }: { startedAt: string }) {
  const { formatted } = useElapsedTimer(startedAt);
  return <>{formatted}</>;
}

/**
 * Tracks an element's rendered height (via a callback ref) so in-flow spacers can clear
 * fixed bottom bars whose height changes with toasts / errors. Layout only.
 */
function useMeasuredHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    setHeight(node.offsetHeight);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setHeight(node.offsetHeight));
    observer.observe(node);
    observerRef.current = observer;
  }, []);
  return [ref, height] as const;
}

/** Opaque floating surface for bottom bars / toasts so content scrolling underneath stays out of the text. */
const floatingSurface = "glass bg-bg-elevated/95";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function CardioRecoveryView({
  day,
  program,
  history,
}: {
  day: ProgramDay;
  program: Program;
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
  const [actionBarRef, actionBarHeight] = useMeasuredHeight<HTMLDivElement>();

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
      <header className="flex items-start justify-between gap-4 px-1 pt-2">
        <div className="min-w-0">
          <h1 className="page-title">{day.focus}</h1>
          {day.duration && <p className="mt-1 text-[13px] tabular-nums text-text-muted">{day.duration}</p>}
        </div>
        {isDoneToday && (
          <span className="mt-1.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-green/12 px-2 py-0.5 text-[12px] font-medium leading-tight text-accent-green">
            <svg {...iconProps} strokeWidth={2.25} className="h-3 w-3">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Done today
          </span>
        )}
      </header>

      {(day.description || day.tips) && (
        <div className="-mt-2 flex flex-col gap-4">
          {day.description && (
            <p className="px-1 text-[15px] leading-relaxed text-text-secondary">{day.description}</p>
          )}
          {day.tips && (
            <section className="flex flex-col gap-1 px-1">
              <h2 className="section-label">Tips</h2>
              <p className="text-[14px] leading-relaxed text-text-muted">{day.tips}</p>
            </section>
          )}
        </div>
      )}

      {/* Activity suggestions — tap to select */}
      {activities.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex min-h-6 items-center justify-between gap-3 px-1">
            <h2 className="section-label">Pick an activity</h2>
          </div>
          <div className="list-group">
            {activities.map((activity, idx) => {
              const isSelected = selectedActivity === activity.name;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedActivity(isSelected ? null : activity.name)}
                  aria-pressed={isSelected}
                  className={`flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected ? "bg-fill" : "active:bg-fill"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] text-text-primary">{activity.name}</span>
                    <span className="text-[13px] leading-snug text-text-muted">{activity.note}</span>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full transition-colors ${
                      isSelected ? "bg-text-primary" : "border-[1.5px] border-text-dim"
                    }`}
                  >
                    {isSelected && (
                      <svg {...iconProps} stroke="#0b0b0c" strokeWidth={3} className="h-3 w-3">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <button
        onClick={() => navigate("/")}
        className={`${isDoneToday ? "btn-secondary" : "btn-tertiary"} mt-auto w-full text-[15px]`}
      >
        Go back
      </button>

      {!isDoneToday && (
        <>
          {/* Spacer so the list clears the floating action bar (grows with the error line) */}
          <div
            aria-hidden="true"
            className="shrink-0"
            style={{
              height: actionBarHeight
                ? Math.max(0, actionBarHeight - 24)
                : "calc(2.5rem + env(safe-area-inset-bottom))",
            }}
          />
          <div
            ref={actionBarRef}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4"
            style={{ paddingBottom: "max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}
          >
            <div className="mx-auto flex max-w-[428px] flex-col gap-2">
              {logError && (
                <p role="alert" className={`${floatingSurface} pointer-events-auto rounded-[1.25rem] px-4 py-2.5 text-[13px] leading-snug text-accent-orange`}>
                  {logError}
                </p>
              )}
              <div className={`${floatingSurface} pointer-events-auto rounded-full p-1.5`}>
                <button
                  onClick={handleMarkDone}
                  className="btn-primary w-full px-5 text-[15px]"
                >
                  <span className="truncate">{selectedActivity ? `Done: ${selectedActivity}` : "Mark as done"}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
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
  const restTimerSound = useSettingsStore((s) => s.restTimerSound);
  const playTimerSound = useCallback(() => {
    if (!restTimerSound) return;
    try {
      const ctx = new AudioContext();
      const playBeep = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        osc.start(time);
        osc.stop(time + duration);
      };
      const now = ctx.currentTime;
      playBeep(now, 880, 0.15);
      playBeep(now + 0.18, 880, 0.15);
      playBeep(now + 0.36, 1174.66, 0.3);
    } catch { /* audio not available */ }
  }, [restTimerSound]);
  const timer = useTimer(playTimerSound);
  const autoStartTimer = useSettingsStore((s) => s.autoStartTimer);
  const gymEquipment = useSettingsStore((s) => s.gymEquipment);
  const weightMode = useExerciseStore((s) => s.weightMode);

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
  const [backOffFeedback, setBackOffFeedback] = useState<string | null>(null);
  const [hasSessionSetInteraction, setHasSessionSetInteraction] = useState(false);
  const [finishBarRef, finishBarHeight] = useMeasuredHeight<HTMLDivElement>();
  const leavingRef = useRef(false);
  const sessionStartRef = useRef(activeWorkout?.startedAt);
  const restPresets = [60, 90, 120, 180, 300];
  const program = programs[0];
  const day = program.days.find((d) => d.id === dayId);
  const todayDateKey = formatDateKey(new Date());
  const todayHasCompletedSession = history.some((workout) => getIsoDateKey(workout.date) === todayDateKey);
  const liftFocus = !isOpen && day?.type === "lift" && isLiftFocus(day.focus) ? day.focus : null;

  // earlierIds: exercises before this one in the session — decides whether a warm-up set is needed
  const seedExerciseEntry = useCallback((exerciseId: string, earlierIds: string[] = []): ExerciseEntry => {
    const exercise = getEffectiveExercise(exerciseId);
    if (!exercise) return { id: exerciseId, name: exerciseId, sets: [] };
    const earlierExercises = earlierIds
      .map((id) => getEffectiveExercise(id))
      .filter((e): e is Exercise => !!e);

    const [lastSets = null, ...olderSessions] = getRecentSessionSets(exerciseId, history);
    const suggestion = getOverloadSuggestion(exercise, lastSets, olderSessions, getDaysSinceExercise(exerciseId, history));
    const sets = createMentzerSets(suggestion, exercise, { warmUp: needsWarmUpSet(exercise, earlierExercises) });

    return { id: exercise.id, name: exercise.name, sets };
  }, [history]);

  // Reset interaction flag when a new session starts
  if (activeWorkout?.startedAt !== sessionStartRef.current) {
    sessionStartRef.current = activeWorkout?.startedAt;
    setHasSessionSetInteraction(false);
    setBackOffFeedback(null);
    // Feedback now shows as a page-wide toast, so a previous session's message must not linger
    setCurationFeedback(null);
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
    const exerciseIds = getDefaultExerciseIds(
      day.exercises,
      lastWorkoutForDay?.exercises.map((e) => e.id),
    );

    const exercises = exerciseIds.map((id, i) => seedExerciseEntry(id, exerciseIds.slice(0, i)));

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

    const ids = activeWorkout.exercises.map((e) => e.id);
    return activeWorkout.exercises.some((entry, i) => {
      // Compare against both seed shapes so reorders/swaps (which can change
      // whether a warm-up is needed) don't read as logged changes
      const withContext = seedExerciseEntry(entry.id, ids.slice(0, i));
      const withWarmUp = seedExerciseEntry(entry.id);
      return !areSetsEqual(entry.sets, withContext.sets) && !areSetsEqual(entry.sets, withWarmUp.sets);
    });
  }, [activeWorkout, seedExerciseEntry]);
  const hasLoggedSets = hasSessionSetInteraction || hasPersistedSetChanges;
  const isBodyweightOnlyMode = useCallback((entry: ExerciseEntry, exercise: Exercise) => {
    if (exercise.equipment !== "bodyweight+") return false;
    const storedMode = weightMode[entry.id];
    if (storedMode) return storedMode === "bodyweight";
    const lastSets = getLastSets(entry.id, history);
    return !(lastSets && lastSets.some((set) => set.weight > 0));
  }, [history, weightMode]);
  const getBackOffSetCount = useCallback((entry: ExerciseEntry) => {
    if (entry.skipped) return 0;
    const exercise = getEffectiveExercise(entry.id);
    if (!exercise) return 0;
    if (isBodyweightOnlyMode(entry, exercise)) return 0;
    return entry.sets.filter((set) => set.weight > 0).length;
  }, [isBodyweightOnlyMode]);
  const backOffWeightedSetCount = useMemo(
    () => activeWorkout?.exercises.reduce((count, entry) => count + getBackOffSetCount(entry), 0) ?? 0,
    [activeWorkout, getBackOffSetCount],
  );
  const canBackOffWorkout = backOffWeightedSetCount > 0;
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

  const handleBackOffWorkout = () => {
    if (!activeWorkout) return;

    let reducedSets = 0;
    const exercises = activeWorkout.exercises.map((entry) => {
      const exercise = getEffectiveExercise(entry.id);
      if (!exercise) return entry;

      const weightedSetCount = getBackOffSetCount(entry);
      if (weightedSetCount === 0) return entry;

      reducedSets += weightedSetCount;
      return {
        ...entry,
        sets: backOffSetsByOneStep(entry.sets, exercise),
      };
    });

    if (reducedSets === 0) {
      setBackOffFeedback("No weighted sets to reduce.");
      return;
    }

    replaceActiveWorkoutExercises(exercises);
    setHasSessionSetInteraction(true);
    setBackOffFeedback(`Reduced ${reducedSets} weighted set${reducedSets === 1 ? "" : "s"} by one step.`);
  };

  const handleBackOffExercise = (exerciseIndex: number) => {
    if (!activeWorkout) return;

    const entry = activeWorkout.exercises[exerciseIndex];
    if (!entry) return;
    const exercise = getEffectiveExercise(entry.id);
    if (!exercise) return;

    const reducedSets = getBackOffSetCount(entry);
    if (reducedSets === 0) {
      setBackOffFeedback(`${entry.name} has no weighted sets to reduce.`);
      return;
    }

    updateExercise(exerciseIndex, {
      ...entry,
      sets: backOffSetsByOneStep(entry.sets, exercise),
    });
    setHasSessionSetInteraction(true);
    setBackOffFeedback(`Reduced ${entry.name} by one step (${reducedSets} set${reducedSets === 1 ? "" : "s"}).`);
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
    updateExercise(swapTarget, seedExerciseEntry(exercise.id, activeWorkout?.exercises.slice(0, swapTarget).map((e) => e.id)));
    setSwapTarget(null);
  };

  const handleAutoReplace = (exerciseIndex: number) => {
    if (!activeWorkout) return;
    const current = activeWorkout.exercises[exerciseIndex];
    const excludeIds = activeWorkout.exercises.map((e) => e.id);
    const replacement = getAutoReplacement(current.id, excludeIds);
    if (replacement) {
      updateExercise(exerciseIndex, seedExerciseEntry(replacement.id, excludeIds.slice(0, exerciseIndex)));
    } else {
      setCurationFeedback("No alternative exercises available for this muscle group.");
    }
  };

  const handleAddExercise = (exercise: Exercise) => {
    addExerciseToWorkout(seedExerciseEntry(exercise.id, activeWorkout?.exercises.map((e) => e.id)));
    setShowAddExercise(false);
  };

  const handleInsertExercise = (exercise: Exercise) => {
    if (insertAtIndex === null) return;
    insertExerciseAtIndex(seedExerciseEntry(exercise.id, activeWorkout?.exercises.slice(0, insertAtIndex).map((e) => e.id)), insertAtIndex);
    setInsertAtIndex(null);
  };

  const handleCurateWorkout = (shuffle = false) => {
    if (!activeWorkout || !liftFocus) return;

    if (hasLoggedSets) {
      setCurationFeedback("Curating is locked after set changes so you do not overwrite workout data.");
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

    replaceActiveWorkoutExercises(result.exerciseIds.map((id, i) => seedExerciseEntry(id, result.exerciseIds.slice(0, i))));
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
        <div className="pt-20 text-center text-[15px] text-text-muted">Loading workout...</div>
      </PageLayout>
    );
  }

  if (!isOpen && day && day.type !== "lift") {
    return <CardioRecoveryView day={day} program={program} history={history} />;
  }

  if (todayHasCompletedSession && !activeWorkout) {
    return (
      <PageLayout withBottomNavPadding={false}>
        <div className="sheet-surface mx-auto mt-[18vh] flex max-w-[400px] flex-col gap-1.5 rounded-[1.25rem] p-5 text-center">
          <p className="section-title">Today already has a logged session</p>
          <p className="text-[15px] leading-relaxed text-text-muted">
            One day can only hold one workout, cardio, or rest entry. Use the Home calendar to undo that day or move it.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" onClick={() => navigate("/")} className="btn-primary w-full px-5 text-[15px]">
              Back to Home
            </button>
            <button type="button" onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/"))} className="btn-secondary w-full px-5 text-[15px]">
              Go back
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!activeWorkout) {
    return (
      <PageLayout withBottomNavPadding={false}>
        <div className="pt-20 text-center text-[15px] text-text-muted">Loading workout...</div>
      </PageLayout>
    );
  }

  const buildCardProps = (exerciseIndex: number) => {
    const entry = activeWorkout.exercises[exerciseIndex];
    const exercise = entry ? getEffectiveExercise(entry.id) : null;
    const [lastSets = null, ...olderSessions] = exercise ? getRecentSessionSets(entry.id, history) : [];
    const suggestion = exercise ? getOverloadSuggestion(exercise, lastSets, olderSessions, getDaysSinceExercise(entry.id, history)) : undefined;

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
      onBackOff: handleBackOffExercise,
      canBackOff: entry ? getBackOffSetCount(entry) > 0 : false,
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

  // Header context line: strip the "Day N — " prefix so only the target muscles remain
  const dayDetail = isOpen ? "Freeform" : (day?.name ?? "").replace(/^Day\s+\d+\s*[—–-]\s*/, "");
  const restRemainingPct = timer.isRunning
    ? (timer.secondsLeft / (restPresets.find((p) => p >= timer.secondsLeft) ?? timer.secondsLeft + 1)) * 100
    : 0;
  const feedbackToasts = [
    backOffFeedback ? { key: "back-off", text: backOffFeedback, dismiss: () => setBackOffFeedback(null) } : null,
    curationFeedback ? { key: "curation", text: curationFeedback, dismiss: () => setCurationFeedback(null) } : null,
  ].filter((toast): toast is { key: string; text: string; dismiss: () => void } => toast !== null);
  const sheetBottomPadding = { paddingBottom: "max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))" };
  const renderInsertButton = (atIndex: number) => (
    <button
      onClick={() => setInsertAtIndex(atIndex)}
      className="group/insert flex min-h-11 min-w-0 flex-1 items-center gap-3"
      aria-label="Insert exercise here"
    >
      <span className="h-px flex-1 bg-separator" />
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fill text-text-muted transition-colors group-active/insert:bg-fill-strong group-active/insert:text-text-primary">
        <svg {...iconProps} strokeWidth={2} className="h-3.5 w-3.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="h-px flex-1 bg-separator" />
    </button>
  );

  return (
    <>
      {/* Rest Timer Sheet */}
      {timer.isRunning && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 animate-fade-in"
          style={sheetBottomPadding}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Rest timer"
            className="sheet-surface flex w-full max-w-[436px] flex-col gap-6 rounded-[1.25rem] px-5 pb-4 pt-7 animate-slide-up"
          >
            <div className="flex flex-col items-center gap-3">
              <p className="section-label">{timer.label}</p>
              <p className="stat-value text-[64px] text-text-primary">
                {timer.formatTime(timer.secondsLeft)}
              </p>
              <div className="mt-1 h-[3px] w-full max-w-[220px] overflow-hidden rounded-full bg-fill">
                <div
                  className="h-full rounded-full bg-accent-red"
                  style={{ width: `${restRemainingPct}%`, transition: "width 1s linear" }}
                />
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-5 gap-2">
              {restPresets.map((seconds) => (
                <button
                  key={seconds}
                  onClick={() => timer.start(seconds, timer.label)}
                  className="btn-secondary min-h-11 px-0 text-[14px] tabular-nums text-text-secondary"
                >
                  {formatDuration(seconds)}
                </button>
              ))}
            </div>

            <button onClick={timer.stop} className="btn-secondary w-full text-[15px]">
              Skip rest
            </button>

            <div className="-mx-1 flex flex-col border-t border-separator pt-1">
              <button
                role="switch"
                aria-checked={autoStartTimer}
                onClick={() => useSettingsStore.getState().setAutoStartTimer(!autoStartTimer)}
                className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-[0.875rem] px-1 text-left text-[14px] text-text-secondary"
              >
                Auto-start timer
                <SwitchIndicator on={autoStartTimer} />
              </button>
              <button
                role="switch"
                aria-checked={restTimerSound}
                onClick={() => useSettingsStore.getState().setRestTimerSound(!restTimerSound)}
                className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-[0.875rem] px-1 text-left text-[14px] text-text-secondary"
              >
                Sound alert
                <SwitchIndicator on={restTimerSound} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit sheet: keep going / go home / cancel */}
      {showCancel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-3 animate-fade-in"
          style={sheetBottomPadding}
          onClick={() => setShowCancel(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="workout-exit-title"
            onClick={(e) => e.stopPropagation()}
            className="sheet-surface flex w-full max-w-[436px] flex-col gap-4 rounded-[1.25rem] p-4 pt-5 animate-slide-up"
          >
            <p id="workout-exit-title" className="section-title px-1">What would you like to do?</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => setShowCancel(false)} className="btn-primary w-full text-[15px]">
                Keep going
              </button>
              <button
                onClick={() => {
                  leavingRef.current = true;
                  navigate("/");
                }}
                className="btn-secondary w-full text-[15px]"
              >
                Go to Home
              </button>
              <button onClick={handleCancel} className="btn-danger w-full text-[15px]">
                Cancel workout
              </button>
            </div>
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

      <PageLayout withBottomNavPadding={false} className="flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-1 pt-2">
          <div className="min-w-0">
            <h1 className="page-title truncate">{isOpen ? "Open workout" : day!.focus}</h1>
            <p className="mt-1 truncate text-[13px] text-text-muted">
              {/* The elapsed time belongs to the active session, which is a different day during a conflict */}
              {!hasDayConflict && (
                <span className="tabular-nums">
                  <ElapsedTime startedAt={activeWorkout.startedAt} />
                </span>
              )}
              {!hasDayConflict && dayDetail && " · "}
              {dayDetail}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setShowWorkoutSetup((value) => !value)}
              aria-expanded={showWorkoutSetup}
              className={`chip min-h-11 gap-1.5 px-3.5 text-[14px] font-medium text-text-primary ${
                showWorkoutSetup ? "bg-fill-strong" : "active:bg-fill-strong"
              }`}
            >
              <svg {...iconProps} className="h-[18px] w-[18px]">
                <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
                <circle cx="16" cy="7" r="2" />
                <circle cx="10" cy="17" r="2" />
              </svg>
              {showWorkoutSetup ? "Done" : "Tools"}
            </button>
            <button
              onClick={() => setShowCancel(true)}
              className="btn-icon shrink-0"
              aria-label="Cancel workout"
            >
              <svg {...iconProps} className="h-5 w-5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Day conflict dialog */}
        {hasDayConflict && activeWorkout && (
          <section className="hero-surface flex flex-col gap-4 rounded-[1.25rem] p-5 animate-slide-up">
            <div className="min-w-0">
              <p className="section-title">You have a workout in progress</p>
              <p className="mt-1 text-[13px] text-text-muted">{activeWorkout.dayName}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => navigate(`/workout/${activeWorkout.dayId}`)}
                className="btn-primary w-full text-[15px]"
              >
                Resume
              </button>
              <button onClick={handleDiscardAndStart} className="btn-tertiary w-full text-[15px] text-accent-red">
                Discard & start new
              </button>
            </div>
          </section>
        )}

        {/* Session tools disclosure (toggled from the header) */}
        {showWorkoutSetup && (
          <section className="list-group animate-fade-up">
            <button
              role="switch"
              aria-checked={showCoachingHints}
              onClick={() => setShowCoachingHints((value) => !value)}
              className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-[15px] text-text-primary">Show hints</span>
              <SwitchIndicator on={showCoachingHints} />
            </button>

            <div className="flex min-h-[3.25rem] items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[15px] text-text-primary">Back off today</p>
                <p className="text-[13px] leading-snug text-text-muted">Use if warm-up feels heavy or form feels off.</p>
              </div>
              <button
                onClick={handleBackOffWorkout}
                disabled={!canBackOffWorkout}
                className="btn-secondary min-h-11 shrink-0 px-4 text-[14px]"
              >
                Back off
              </button>
            </div>

            {liftFocus && (
              <div className="flex flex-col gap-3 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] text-text-primary">Curate from My Gym</p>
                    <p className="text-[13px] tabular-nums text-text-muted">
                      {selectedEquipmentCount}/{gymEquipmentOptions.length} equipment · {curatedExerciseIds.length} matched
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/my-gym")}
                    className="btn-tertiary -mr-2 -mt-1.5 shrink-0 gap-1 px-3 text-[14px]"
                  >
                    My Gym
                    <svg {...iconProps} className="h-4 w-4">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>

                {hasLoggedSets && (
                  <p className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-yellow" />
                    Locked after set changes
                  </p>
                )}

                {curatedResult && curatedResult.skippedSlots.length > 0 && !hasLoggedSets && (
                  <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-text-secondary">
                    <span aria-hidden="true" className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-yellow" />
                    <span>Missing equipment for: {curatedResult.skippedSlots.join(", ")}</span>
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCurateWorkout(false)}
                    disabled={hasLoggedSets || curatedExerciseIds.length === 0}
                    className="btn-secondary min-h-11 px-3 text-[14px]"
                  >
                    Build workout
                  </button>
                  <button
                    onClick={() => handleCurateWorkout(true)}
                    disabled={hasLoggedSets || curatedExerciseIds.length === 0}
                    className="btn-secondary min-h-11 px-3 text-[14px]"
                  >
                    Try another split
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Recovery note */}
        {recoveringGroups.length > 0 && (
          <section className="surface-card-muted flex flex-col rounded-[1.25rem] px-4 py-3">
            <div className="flex items-start gap-2.5">
              <span aria-hidden="true" className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-orange" />
              <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-text-secondary">
                {recoveringGroups.length === 1
                  ? `${recoveringGroups[0].group} was trained recently. Review it before pushing hard again.`
                  : `${recoveringGroups.length} target muscle groups were trained recently. Review them before logging.`}
              </p>
              <button
                onClick={() => setShowRecoveryActions((value) => !value)}
                aria-expanded={showRecoveryActions}
                className="btn-tertiary -my-2.5 -mr-2 shrink-0 px-3 text-[13px] text-text-primary"
              >
                {showRecoveryActions ? "Hide" : "Review"}
              </button>
            </div>

            {showRecoveryActions && recoveringGroups.map((groupStatus) => {
              const consecutiveSkips = skipHistory.get(groupStatus.group) ?? 0;
              const exerciseIndices = groupExerciseIndices.get(groupStatus.group) ?? [];
              const exerciseCount = exerciseIndices.length;

              return (
                <div key={groupStatus.group} className="mt-3 flex flex-col gap-2.5 border-t border-separator pt-3">
                  <p className="text-[13px] leading-relaxed text-text-secondary">
                    <span className="font-medium text-text-primary">{groupStatus.group}</span> was trained {groupStatus.daysSinceLastTrained}d ago. Heavy Duty usually works best with 4-7 days rest.
                  </p>

                  {consecutiveSkips >= 2 ? (
                    <p className="text-[13px] font-medium leading-snug text-accent-red">
                      {groupStatus.group} has been skipped {consecutiveSkips} sessions in a row. Train it today for balanced progress.
                    </p>
                  ) : consecutiveSkips === 1 ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-[13px] leading-snug text-accent-orange">
                        {groupStatus.group} was also skipped last session. Skipping again may slow progress.
                      </p>
                      <button
                        onClick={() => {
                          const sorted = [...exerciseIndices].sort((a, b) => b - a);
                          for (const idx of sorted) skipExercise(idx);
                        }}
                        className="btn-secondary min-h-11 self-start px-4 text-[14px] text-accent-orange"
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
                      className="btn-secondary min-h-11 self-start px-4 text-[14px]"
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
          <section className="flex flex-col items-center gap-5 px-6 pt-12 text-center">
            <svg {...iconProps} aria-hidden="true" className="h-7 w-7 text-text-muted">
              <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
            </svg>
            <div className="flex max-w-[18rem] flex-col gap-1.5">
              <p className="section-title">No exercises yet</p>
              <p className="text-[15px] leading-relaxed text-text-muted">
                {isOpen ? "Add your first exercise to start logging." : "No lift exercises are loaded for this day."}
              </p>
            </div>
            {!showWorkoutSetup && (
              <button
                onClick={() => setShowAddExercise(true)}
                className={`${hasDayConflict ? "btn-secondary" : "btn-primary"} px-6 text-[15px]`}
              >
                <svg {...iconProps} className="h-[18px] w-[18px]">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add exercise
              </button>
            )}
          </section>
        )}

        {/* Exercise groups — in edit mode each card gets one control row: insert-before + reorder */}
        {groups.length > 0 && (
          <div className="flex flex-col gap-3">
            {groups.map((group, groupIndex) => {
              const isFirst = groupIndex === 0;
              const isLast = groupIndex === groups.length - 1;

              return (
                <section key={`s-${group.index}`} className="flex flex-col gap-2">
                  {showWorkoutSetup && (
                    <div className="flex items-center gap-3">
                      {renderInsertButton(group.index)}
                      <div className="flex shrink-0 rounded-full bg-fill">
                        <button
                          onClick={() => handleMoveGroup(groupIndex, "up")}
                          className={`flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors active:bg-fill-strong ${isFirst ? "pointer-events-none opacity-30" : ""}`}
                          aria-label="Move up"
                        >
                          <svg {...iconProps} className="h-[18px] w-[18px]">
                            <path d="M18 15l-6-6-6 6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveGroup(groupIndex, "down")}
                          className={`flex h-11 w-11 items-center justify-center rounded-full text-text-secondary transition-colors active:bg-fill-strong ${isLast ? "pointer-events-none opacity-30" : ""}`}
                          aria-label="Move down"
                        >
                          <svg {...iconProps} className="h-[18px] w-[18px]">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  <ExerciseCard {...buildCardProps(group.index)} />
                </section>
              );
            })}
            {showWorkoutSetup && renderInsertButton(activeWorkout.exercises.length)}
          </div>
        )}

        {/* Add exercise / leave edit mode */}
        {showWorkoutSetup && (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setShowAddExercise(true)}
              className={`${activeWorkout.exercises.length === 0 ? "btn-primary" : "btn-secondary"} w-full text-[15px]`}
            >
              <svg {...iconProps} className="h-[18px] w-[18px]">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add exercise
            </button>
            <button onClick={() => setShowWorkoutSetup(false)} className="btn-tertiary w-full text-[15px]">
              Back to logging
            </button>
          </div>
        )}

        {/* Spacer so the last card clears the floating finish bar (grows with toasts / errors) */}
        <div
          aria-hidden="true"
          className="shrink-0"
          style={{
            height: finishBarHeight
              ? Math.max(0, finishBarHeight - 16)
              : "calc(3.5rem + env(safe-area-inset-bottom))",
          }}
        />
      </PageLayout>

      {/* Sticky finish bar + feedback toasts */}
      <div
        ref={finishBarRef}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4"
        style={sheetBottomPadding}
      >
        <div className="mx-auto flex max-w-[428px] flex-col gap-2">
          {feedbackToasts.map((toast) => (
            <div
              key={toast.key}
              role="status"
              className={`${floatingSurface} pointer-events-auto flex items-center gap-2 self-center rounded-[1.25rem] py-1.5 pl-4 pr-1.5 text-[13px] leading-snug text-text-primary animate-fade-up`}
            >
              <span className="min-w-0 py-1">{toast.text}</span>
              <button
                onClick={toast.dismiss}
                aria-label="Dismiss"
                className="-my-1.5 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted active:bg-fill"
              >
                <svg {...iconProps} className="h-4 w-4">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {sessionSaveError && (
            <p role="alert" className={`${floatingSurface} pointer-events-auto rounded-[1.25rem] px-4 py-2.5 text-[13px] leading-snug text-accent-orange`}>
              {sessionSaveError}
            </p>
          )}
          <div className={`${floatingSurface} pointer-events-auto flex items-center gap-4 rounded-full py-1.5 pl-5 pr-1.5`}>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="truncate text-[13px] tabular-nums text-text-muted">
                <span className="font-semibold text-text-primary">{completedSets}/{totalSets}</span> sets · {activeExerciseCount} exercise{activeExerciseCount !== 1 ? "s" : ""}
              </p>
              <div className="h-[3px] overflow-hidden rounded-full bg-fill">
                <div
                  className="h-full rounded-full bg-text-primary transition-[width] duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <button
              onClick={handleFinish}
              className={`${totalSets === 0 || hasDayConflict ? "btn-secondary" : "btn-primary"} shrink-0 px-7 text-[15px]`}
            >
              Finish
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
