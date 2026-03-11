import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getEffectiveExercise, muscleColors } from "../data/exercises";
import { checkPR, hasPR, getPRLabel } from "../lib/records";
import { getLastSets, useWorkoutStore } from "../store/workoutStore";
import { useExerciseStore } from "../store/exerciseStore";
import { StepperInput } from "./StepperInput";
import type { Equipment, ExerciseEntry, SetEntry, OverloadSuggestion } from "../types";

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
  onSkip?: (exerciseIndex: number) => void;
  onUnskip?: (exerciseIndex: number) => void;
  onSetComplete?: (exerciseIndex: number) => void;
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
  onSkip,
  onUnskip,
  onSetComplete,
  showOverloadBanner,
  overloadSuggestion,
  restButtons,
  previousSets,
}: ExerciseCardProps) {
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [weightOverride, setWeightOverride] = useState<boolean | undefined>(undefined);
  const [showMenu, setShowMenu] = useState(false);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);
  const [completedSets, setCompletedSets] = useState<Set<number>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const { weightMode, setWeightMode, equipmentOverride, setEquipmentOverride } = useExerciseStore();
  const history = useWorkoutStore((s) => s.history);

  const exercise = getEffectiveExercise(entry.id);

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

  const color = muscleColors[exercise.primaryMuscles[0]] || "#888";

  // Collapsed skipped render
  if (entry.skipped) {
    return (
      <div
        className={`relative rounded-2xl ${showMenu ? "z-30" : ""}`}
        style={{
          background: `linear-gradient(135deg, ${color}08 0%, rgba(255,255,255,0.02) 50%)`,
          border: `1px solid ${color}18`,
        }}
      >
        <div
          className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl"
          style={{ background: `${color}40` }}
        />
        <div className="flex items-center justify-between pl-5 pr-4 py-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-medium text-text-secondary">{entry.name}</h2>
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: `${color}15`, color: `${color}CC` }}
            >
              Skipped
            </span>
          </div>
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-text-dim transition-colors active:bg-white/[0.06]"
              aria-label="Exercise options"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <circle cx="12" cy="6" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-2xl py-1 animate-fade-in"
                style={{
                  background: "rgba(30,31,36,0.98)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                {onUnskip && (
                  <button
                    onClick={() => { onUnskip(exerciseIndex); setShowMenu(false); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-accent-green transition-colors active:bg-white/[0.06]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M9 12l2 2 4-4" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                    Unskip
                  </button>
                )}
                <button
                  onClick={() => { onSwap(exerciseIndex); setShowMenu(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-text-primary transition-colors active:bg-white/[0.06]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-text-muted">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  Swap Exercise
                </button>
                <button
                  onClick={() => { setRemoveConfirm(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-accent-red transition-colors active:bg-white/[0.06]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
        {removeConfirm && (
          <div
            className="flex flex-col gap-3 rounded-xl mx-4 mb-4 p-4"
            style={{ background: "rgba(229,9,20,0.06)", border: "1px solid rgba(229,9,20,0.12)" }}
          >
            <p className="text-xs text-text-secondary">Remove this exercise?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onRemove(exerciseIndex); setRemoveConfirm(false); }}
                className="rounded-xl bg-accent-red py-2.5 text-xs font-bold text-white transition-all active:scale-[0.97]"
              >
                Remove
              </button>
              <button
                onClick={() => setRemoveConfirm(false)}
                className="rounded-xl border border-white/[0.08] bg-transparent py-2.5 text-xs text-text-secondary transition-colors active:bg-white/[0.04]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
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
    const wasComplete = completedSets.has(setIndex);
    setCompletedSets((prev) => {
      const next = new Set(prev);
      if (next.has(setIndex)) next.delete(setIndex);
      else next.add(setIndex);
      return next;
    });
    if (!wasComplete && onSetComplete) {
      onSetComplete(exerciseIndex);
    }
  };

  const isSetComplete = (set: SetEntry, setIndex: number): boolean => {
    if (completedSets.has(setIndex)) return true;
    if (bwMode) return set.reps > 0;
    return set.weight > 0 && set.reps > 0;
  };

  const completedCount = entry.sets.filter((s, i) => isSetComplete(s, i)).length;
  const totalSets = entry.sets.length;

  const getSetPR = (set: SetEntry, setIndex: number) => {
    if (!showOverloadBanner) return null;
    if (!isSetComplete(set, setIndex)) return null;
    if (set.reps === 0) return null;
    const pr = checkPR(entry.id, set, history);
    return hasPR(pr) ? getPRLabel(pr) : null;
  };

  const overloadColor =
    overloadSuggestion?.type === "increase"
      ? "#46D369"
      : overloadSuggestion?.type === "decrease"
        ? "#FF6B35"
        : overloadSuggestion?.type === "testing"
          ? "#4488FF"
          : "#5A5B63";

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: `linear-gradient(135deg, ${color}06 0%, transparent 50%)`,
        border: `1px solid ${color}15`,
      }}
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: `linear-gradient(180deg, ${color}, ${color}30)` }}
      />

      <div className="flex flex-col gap-3.5 pl-5 pr-4 py-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold text-text-primary leading-tight">{entry.name}</h2>
              {exercise.type === "compound" && (
                <span
                  className="rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-widest"
                  style={{ color, background: `${color}15` }}
                >
                  C
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowEquipmentPicker(!showEquipmentPicker)}
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted transition-colors active:bg-white/[0.1]"
              >
                {exercise.equipment === "bodyweight+" ? "BW+" : exercise.equipment}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-2.5 w-2.5 opacity-50">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <span className="text-[11px] text-text-dim">
                {exercise.repRange[0]}–{exercise.repRange[1]} reps
              </span>
              {showOverloadBanner && totalSets > 0 && (
                <>
                  <span className="text-[11px] text-text-dim">·</span>
                  <span className="text-[11px] tabular-nums" style={{ color: completedCount === totalSets ? "#46D369" : "var(--color-text-dim)" }}>
                    {completedCount}/{totalSets}
                  </span>
                </>
              )}
              {isBwExercise && (
                <button
                  onClick={toggleWeightMode}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                    bwMode
                      ? "border-white/[0.08] bg-white/[0.04] text-text-muted"
                      : "border-accent-blue/20 bg-accent-blue/10 text-accent-blue"
                  }`}
                >
                  {bwMode ? "+ Weight" : "BW Only"}
                </button>
              )}
            </div>
          </div>

          {/* Context menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-text-dim transition-colors active:bg-white/[0.06]"
              aria-label="Exercise options"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <circle cx="12" cy="6" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-2xl py-1 animate-fade-in"
                style={{
                  background: "rgba(30,31,36,0.98)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                <button
                  onClick={() => { onSwap(exerciseIndex); setShowMenu(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-text-primary transition-colors active:bg-white/[0.06]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-text-muted">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  Swap Exercise
                </button>
                {onSkip && (
                  <button
                    onClick={() => { onSkip(exerciseIndex); setShowMenu(false); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-accent-yellow transition-colors active:bg-white/[0.06]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M5 5l14 7-14 7V5z" />
                    </svg>
                    Skip This Week
                  </button>
                )}
                <button
                  onClick={() => { setRemoveConfirm(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-accent-red transition-colors active:bg-white/[0.06]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Equipment picker */}
        {showEquipmentPicker && (
          <div className="flex flex-wrap gap-1.5">
            {(["barbell", "dumbbells", "cable", "machine", "bodyweight+"] as Equipment[]).map((eq) => {
              const isActive = exercise.equipment === eq;
              const hasOverride = !!equipmentOverride[entry.id];
              const label = eq === "bodyweight+" ? "BW+" : eq.charAt(0).toUpperCase() + eq.slice(1);
              return (
                <button
                  key={eq}
                  onClick={() => {
                    setEquipmentOverride(entry.id, eq);
                    setShowEquipmentPicker(false);
                    setWeightOverride(undefined);
                  }}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? hasOverride
                        ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/25"
                        : "bg-white/[0.1] text-text-primary border border-white/[0.12]"
                      : "bg-white/[0.04] text-text-dim border border-white/[0.06] active:bg-white/[0.08]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Overload banner */}
        {showOverloadBanner && overloadSuggestion && (
          <div
            className="rounded-xl px-3.5 py-2.5 text-xs leading-relaxed"
            style={{ background: `${overloadColor}10`, border: `1px solid ${overloadColor}15` }}
          >
            <span className="font-bold uppercase tracking-wider" style={{ color: overloadColor }}>
              {overloadSuggestion.type === "increase"
                ? bwMode ? "Reps Maxed" : "Weight Up"
                : overloadSuggestion.type === "decrease"
                  ? "Weight Down"
                  : overloadSuggestion.type === "testing"
                    ? "Testing"
                    : "Building Reps"}
            </span>
            <span className="mx-1.5 opacity-30">·</span>
            <span style={{ color: `${overloadColor}CC` }}>{overloadSuggestion.message}</span>
          </div>
        )}

        {/* Set inputs */}
        <div className="flex flex-col gap-2">
          {bwMode ? (
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem_2rem] items-center gap-1 px-0.5 text-[10px] font-semibold tracking-wider text-text-dim uppercase">
              <span className="text-center">#</span>
              <span>Reps</span>
              <span className="text-center">Fail</span>
              <span />
            </div>
          ) : (
            <div className="grid grid-cols-[2.5rem_minmax(4rem,1fr)_minmax(3.5rem,1fr)_2.5rem_2rem] items-center gap-1 px-0.5 text-[10px] font-semibold tracking-wider text-text-dim uppercase">
              <span className="text-center">#</span>
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
                <div
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem_2rem] items-start gap-1 rounded-xl transition-all"
                  style={completed ? { background: `${color}08` } : {}}
                >
                  <div className="flex h-11 flex-col items-center justify-center">
                    <button
                      onClick={() => toggleSetComplete(setIndex)}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-all"
                    >
                      {completed ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: `${color}25` }}>
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                            <path d="M8 12l3 3 5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      ) : (
                        <span className="text-[12px] font-semibold text-text-dim">{setIndex + 1}</span>
                      )}
                    </button>
                    {entry.sets.length === 2 && !completed && (
                      <span className={`text-[8px] font-bold uppercase tracking-wide ${setIndex === 0 ? "text-text-dim" : "text-accent-red/70"}`}>
                        {setIndex === 0 ? "W-up" : "Work"}
                      </span>
                    )}
                  </div>
                  <StepperInput
                    value={set.reps}
                    onChange={(v) => onSetChange(exerciseIndex, setIndex, "reps", v)}
                    step={1}
                    prevHint={prevSet ? `prev: ${prevSet.reps}` : undefined}
                    onPrevTap={prevSet ? () => onSetChange(exerciseIndex, setIndex, "reps", prevSet.reps) : undefined}
                  />
                  <button
                    onClick={() => onSetChange(exerciseIndex, setIndex, "toFailure", !set.toFailure)}
                    className={`h-11 rounded-xl text-[11px] font-semibold transition-all ${
                      set.toFailure
                        ? "bg-accent-red/15 text-accent-red"
                        : "bg-white/[0.04] text-text-dim border border-white/[0.04]"
                    }`}
                  >
                    {set.toFailure ? "F" : "—"}
                  </button>
                  <button
                    onClick={() => onRemoveSet(exerciseIndex, setIndex)}
                    className={`flex h-11 w-full items-center justify-center rounded-xl text-text-dim transition-colors active:bg-white/[0.06] ${
                      entry.sets.length <= 1 ? "pointer-events-none opacity-20" : ""
                    }`}
                    aria-label={`Remove set ${setIndex + 1}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <AnimatePresence>
                  {prLabel && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 600, damping: 20 }}
                      className="ml-8 inline-block self-start rounded-full bg-accent-yellow/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent-yellow"
                    >
                      {prLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div key={setIndex} className="flex flex-col gap-1">
                <div
                  className="grid grid-cols-[2.5rem_minmax(4rem,1fr)_minmax(3.5rem,1fr)_2.5rem_2rem] items-start gap-1 rounded-xl transition-all"
                  style={completed ? { background: `${color}08` } : {}}
                >
                  <div className="flex h-11 flex-col items-center justify-center">
                    <button
                      onClick={() => toggleSetComplete(setIndex)}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-all"
                    >
                      {completed ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: `${color}25` }}>
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                            <path d="M8 12l3 3 5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      ) : (
                        <span className="text-[12px] font-semibold text-text-dim">{setIndex + 1}</span>
                      )}
                    </button>
                    {entry.sets.length === 2 && !completed && (
                      <span className={`text-[8px] font-bold uppercase tracking-wide ${setIndex === 0 ? "text-text-dim" : "text-accent-red/70"}`}>
                        {setIndex === 0 ? "W-up" : "Work"}
                      </span>
                    )}
                  </div>
                  <StepperInput
                    value={set.weight}
                    onChange={(v) => onSetChange(exerciseIndex, setIndex, "weight", v)}
                    step={exercise.weightIncrement}
                    inputMode="decimal"
                    prevHint={prevSet ? `prev: ${prevSet.weight}kg` : undefined}
                    onPrevTap={prevSet ? () => onSetChange(exerciseIndex, setIndex, "weight", prevSet.weight) : undefined}
                  />
                  <StepperInput
                    value={set.reps}
                    onChange={(v) => onSetChange(exerciseIndex, setIndex, "reps", v)}
                    step={1}
                    prevHint={prevSet ? `prev: ${prevSet.reps}` : undefined}
                    onPrevTap={prevSet ? () => onSetChange(exerciseIndex, setIndex, "reps", prevSet.reps) : undefined}
                  />
                  <button
                    onClick={() => onSetChange(exerciseIndex, setIndex, "toFailure", !set.toFailure)}
                    className={`h-11 rounded-xl text-[11px] font-semibold transition-all ${
                      set.toFailure
                        ? "bg-accent-red/15 text-accent-red"
                        : "bg-white/[0.04] text-text-dim border border-white/[0.04]"
                    }`}
                  >
                    {set.toFailure ? "F" : "—"}
                  </button>
                  <button
                    onClick={() => onRemoveSet(exerciseIndex, setIndex)}
                    className={`flex h-11 w-full items-center justify-center rounded-xl text-text-dim transition-colors active:bg-white/[0.06] ${
                      entry.sets.length <= 1 ? "pointer-events-none opacity-20" : ""
                    }`}
                    aria-label={`Remove set ${setIndex + 1}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <AnimatePresence>
                  {prLabel && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 600, damping: 20 }}
                      className="ml-8 inline-block self-start rounded-full bg-accent-yellow/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent-yellow"
                    >
                      {prLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Remove confirm */}
        {removeConfirm && (
          <div
            className="flex flex-col gap-3 rounded-xl p-4"
            style={{ background: "rgba(229,9,20,0.06)", border: "1px solid rgba(229,9,20,0.12)" }}
          >
            <p className="text-xs text-text-secondary">Remove this exercise?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRemoveConfirmed}
                className="rounded-xl bg-accent-red py-2.5 text-xs font-bold text-white transition-all active:scale-[0.97]"
              >
                Remove
              </button>
              <button
                onClick={() => setRemoveConfirm(false)}
                className="rounded-xl border border-white/[0.08] bg-transparent py-2.5 text-xs text-text-secondary transition-colors active:bg-white/[0.04]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onAddSet(exerciseIndex)}
            className="flex-1 rounded-xl border border-white/[0.08] bg-transparent py-2.5 text-[13px] font-medium text-text-secondary transition-colors active:bg-white/[0.04]"
          >
            + Set
          </button>

          {restButtons?.map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              className="rounded-xl border border-white/[0.08] bg-transparent px-4 py-2.5 text-[13px] font-medium text-text-secondary transition-colors active:bg-white/[0.04]"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
