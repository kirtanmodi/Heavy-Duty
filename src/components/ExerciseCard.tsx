import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getEffectiveExercise } from "../data/exercises";
import { checkPR, hasPR, getPRLabel } from "../lib/records";
import { getLastSets, useWorkoutStore } from "../store/workoutStore";
import { useExerciseStore } from "../store/exerciseStore";
import type { ExerciseEntry, SetEntry, OverloadSuggestion } from "../types";

interface RestButton {
  label: string;
  onClick: () => void;
}

interface ExerciseCardProps {
  entry: ExerciseEntry;
  exerciseIndex: number;
  onSetChange: (exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: number | boolean) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onSwap: (exerciseIndex: number) => void;
  onRemove: (exerciseIndex: number) => void;
  showOverloadBanner?: boolean;
  overloadSuggestion?: OverloadSuggestion;
  restButtons?: RestButton[];
  previousSets?: SetEntry[];
}

export function ExerciseCard({
  entry,
  exerciseIndex,
  onSetChange,
  onAddSet,
  onRemoveSet,
  onSwap,
  onRemove,
  showOverloadBanner,
  overloadSuggestion,
  restButtons,
  previousSets,
}: ExerciseCardProps) {
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [weightOverride, setWeightOverride] = useState<boolean | undefined>(undefined);
  const [showMenu, setShowMenu] = useState(false);
  const [completedSets, setCompletedSets] = useState<Set<number>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const { weightMode, setWeightMode } = useExerciseStore();
  const history = useWorkoutStore((s) => s.history);

  const exercise = getEffectiveExercise(entry.id);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  if (!exercise) return null;

  const isBwExercise = exercise.equipment === "bodyweight+";

  const bwMode = (() => {
    if (weightOverride !== undefined) return !weightOverride;
    if (!isBwExercise) return false;
    const stored = weightMode[entry.id];
    if (stored) return stored === "bodyweight";
    const last = getLastSets(entry.id, history);
    if (last && last.some((s) => s.weight > 0)) return false;
    return true;
  })();

  const toggleWeightMode = () => {
    setWeightOverride(bwMode);
    setWeightMode(entry.id, bwMode ? "weighted" : "bodyweight");
  };

  const handleRemoveConfirmed = () => {
    onRemove(exerciseIndex);
    setRemoveConfirm(false);
  };

  const toggleSetComplete = (setIndex: number) => {
    setCompletedSets((prev) => {
      const next = new Set(prev);
      if (next.has(setIndex)) next.delete(setIndex);
      else next.add(setIndex);
      return next;
    });
  };

  const isSetComplete = (set: SetEntry, setIndex: number): boolean => {
    if (completedSets.has(setIndex)) return true;
    // Auto-complete when both weight (or BW mode) and reps are filled
    if (bwMode) return set.reps > 0;
    return set.weight > 0 && set.reps > 0;
  };

  const selectAllOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  const getSetPR = (set: SetEntry, setIndex: number) => {
    if (!showOverloadBanner) return null; // Only check PR during active workout
    if (!isSetComplete(set, setIndex)) return null;
    if (set.reps === 0) return null;
    const pr = checkPR(entry.id, set, history);
    return hasPR(pr) ? getPRLabel(pr) : null;
  };

  return (
    <div className="rounded-[14px] bg-bg-card card-surface px-5 py-5">
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
                  onClick={toggleWeightMode}
                  className={`rounded-full border border-border-card px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                    bwMode ? "bg-bg-input text-text-muted" : "bg-accent-blue/12 text-accent-blue"
                  }`}
                >
                  {bwMode ? "+ Add Weight" : "BW Only"}
                </button>
              )}
            </div>
          </div>
          {/* Context menu (replaces separate swap/remove buttons) */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-border-card bg-bg-input text-text-muted transition-colors active:bg-bg-card-hover"
              aria-label="Exercise options"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <circle cx="12" cy="6" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-[10px] bg-bg-card card-surface py-1 animate-fade-in">
                <button
                  onClick={() => { onSwap(exerciseIndex); setShowMenu(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text-primary active:bg-bg-input"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-text-muted">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  Swap Exercise
                </button>
                <button
                  onClick={() => { setRemoveConfirm(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-accent-red active:bg-bg-input"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove Exercise
                </button>
              </div>
            )}
          </div>
        </div>

        {showOverloadBanner && overloadSuggestion && (
          <div
            className={`rounded-[10px] px-4 py-2.5 text-xs leading-relaxed ${
              overloadSuggestion.type === "increase"
                ? "bg-accent-green/10 text-accent-green"
                : overloadSuggestion.type === "decrease"
                  ? "bg-accent-orange/10 text-accent-orange"
                  : overloadSuggestion.type === "testing"
                    ? "bg-accent-blue/10 text-accent-blue"
                    : "bg-bg-input text-text-secondary"
            }`}
          >
            <span className="font-semibold uppercase tracking-wider">
              {overloadSuggestion.type === "increase" ? (bwMode ? "Reps Maxed" : "Weight Up") : overloadSuggestion.type === "decrease" ? "Weight Down" : overloadSuggestion.type === "testing" ? "Testing" : "Building Reps"}
            </span>
            <span className="mx-1.5 opacity-40">·</span>
            {overloadSuggestion.message}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {bwMode ? (
            <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_3rem_2.75rem] items-center gap-1.5 text-[10px] font-medium tracking-wider text-text-muted uppercase">
              <span className="text-center">Set</span>
              <span>Reps</span>
              <span className="text-center">Fail</span>
              <span />
            </div>
          ) : (
            <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_3rem_2.75rem] items-center gap-1.5 text-[10px] font-medium tracking-wider text-text-muted uppercase">
              <span className="text-center">Set</span>
              <span>Kg</span>
              <span>Reps</span>
              <span className="text-center">Fail</span>
              <span />
            </div>
          )}

          {entry.sets.map((set, setIndex) => {
            const completed = isSetComplete(set, setIndex);
            const prevSet = previousSets?.[setIndex];
            const prLabel = getSetPR(set, setIndex);

            return bwMode ? (
              <div key={setIndex} className="flex flex-col gap-1">
              <div className={`grid grid-cols-[2.25rem_minmax(0,1fr)_3rem_2.75rem] items-center gap-1.5 rounded-lg transition-colors ${completed ? "bg-accent-green/5" : ""}`}>
                <button
                  onClick={() => toggleSetComplete(setIndex)}
                  className="mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                  aria-label={completed ? `Set ${setIndex + 1} complete` : `Mark set ${setIndex + 1} complete`}
                >
                  {completed ? (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <circle cx="12" cy="12" r="10" fill="var(--color-accent-green)" opacity="0.2" />
                      <path d="M8 12l3 3 5-5" stroke="var(--color-accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="text-sm text-text-muted">{setIndex + 1}</span>
                  )}
                </button>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps || ""}
                    onChange={(e) => onSetChange(exerciseIndex, setIndex, "reps", parseInt(e.target.value) || 0)}
                    onFocus={selectAllOnFocus}
                    className="h-12 w-full min-w-0 rounded-[10px] border border-border-card bg-bg-input px-2 text-center text-base tabular-nums text-text-primary outline-none input-focus"
                    placeholder="0"
                  />
                  {prevSet && (
                    <span className="absolute -bottom-3.5 left-0 right-0 text-center text-[9px] tabular-nums text-text-dim">
                      prev: {prevSet.reps}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onSetChange(exerciseIndex, setIndex, "toFailure", !set.toFailure)}
                  className={`h-12 rounded-[10px] text-xs font-medium transition-colors ${set.toFailure ? "bg-accent-red/15 text-accent-red" : "bg-bg-input text-text-muted"}`}
                >
                  {set.toFailure ? "Yes" : "No"}
                </button>
                <button
                  onClick={() => onRemoveSet(exerciseIndex, setIndex)}
                  className={`flex h-11 w-11 items-center justify-center text-lg text-text-dim ${entry.sets.length <= 1 ? "pointer-events-none opacity-20" : ""}`}
                  aria-label={`Remove set ${setIndex + 1}`}
                >
                  ×
                </button>
              </div>
              <AnimatePresence>
                {prLabel && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 20 }}
                    className="ml-9 inline-block self-start rounded-full bg-accent-yellow/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent-yellow"
                  >
                    {prLabel}
                  </motion.span>
                )}
              </AnimatePresence>
              </div>
            ) : (
              <div key={setIndex} className="flex flex-col gap-1">
              <div className={`grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_3rem_2.75rem] items-center gap-1.5 rounded-lg transition-colors ${completed ? "bg-accent-green/5" : ""}`}>
                <button
                  onClick={() => toggleSetComplete(setIndex)}
                  className="mx-auto flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                  aria-label={completed ? `Set ${setIndex + 1} complete` : `Mark set ${setIndex + 1} complete`}
                >
                  {completed ? (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <circle cx="12" cy="12" r="10" fill="var(--color-accent-green)" opacity="0.2" />
                      <path d="M8 12l3 3 5-5" stroke="var(--color-accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="text-sm text-text-muted">{setIndex + 1}</span>
                  )}
                </button>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={set.weight || ""}
                    onChange={(e) => onSetChange(exerciseIndex, setIndex, "weight", parseFloat(e.target.value) || 0)}
                    onFocus={selectAllOnFocus}
                    className="h-12 w-full min-w-0 rounded-[10px] border border-border-card bg-bg-input px-2 text-center text-base tabular-nums text-text-primary outline-none input-focus"
                    placeholder="0"
                  />
                  {prevSet && (
                    <span className="absolute -bottom-3.5 left-0 right-0 text-center text-[9px] tabular-nums text-text-dim">
                      prev: {prevSet.weight}kg
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps || ""}
                    onChange={(e) => onSetChange(exerciseIndex, setIndex, "reps", parseInt(e.target.value) || 0)}
                    onFocus={selectAllOnFocus}
                    className="h-12 w-full min-w-0 rounded-[10px] border border-border-card bg-bg-input px-2 text-center text-base tabular-nums text-text-primary outline-none input-focus"
                    placeholder="0"
                  />
                  {prevSet && (
                    <span className="absolute -bottom-3.5 left-0 right-0 text-center text-[9px] tabular-nums text-text-dim">
                      prev: {prevSet.reps}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onSetChange(exerciseIndex, setIndex, "toFailure", !set.toFailure)}
                  className={`h-12 rounded-[10px] text-xs font-medium transition-colors ${set.toFailure ? "bg-accent-red/15 text-accent-red" : "bg-bg-input text-text-muted"}`}
                >
                  {set.toFailure ? "Yes" : "No"}
                </button>
                <button
                  onClick={() => onRemoveSet(exerciseIndex, setIndex)}
                  className={`flex h-11 w-11 items-center justify-center text-lg text-text-dim ${entry.sets.length <= 1 ? "pointer-events-none opacity-20" : ""}`}
                  aria-label={`Remove set ${setIndex + 1}`}
                >
                  ×
                </button>
              </div>
              <AnimatePresence>
                {prLabel && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 20 }}
                    className="ml-9 inline-block self-start rounded-full bg-accent-yellow/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent-yellow"
                  >
                    {prLabel}
                  </motion.span>
                )}
              </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Add spacing when previous values are shown */}
        {previousSets && previousSets.length > 0 && <div className="h-1" />}

        {removeConfirm && (
          <div className="flex flex-col gap-3 rounded-[10px] border border-accent-red/15 bg-accent-red/8 p-4">
            <p className="text-xs text-text-secondary">Remove this exercise? Logged sets will be lost.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleRemoveConfirmed} className="rounded-md bg-accent-red py-2.5 text-xs font-semibold text-white">
                Remove
              </button>
              <button onClick={() => setRemoveConfirm(false)} className="rounded-md bg-bg-input py-2.5 text-xs text-text-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onAddSet(exerciseIndex)}
            className="flex-1 rounded-[10px] btn-ghost py-3 text-sm font-medium transition-colors"
          >
            Add Set
          </button>

          {restButtons?.map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              className="rounded-[10px] btn-ghost px-4 py-3 text-sm font-medium transition-colors"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
