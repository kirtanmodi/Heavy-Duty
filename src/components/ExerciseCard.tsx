import { useState } from "react";
import { getEffectiveExercise } from "../data/exercises";
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
}: ExerciseCardProps) {
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [weightOverride, setWeightOverride] = useState<boolean | undefined>(undefined);
  const { weightMode, setWeightMode } = useExerciseStore();
  const history = useWorkoutStore((s) => s.history);

  const exercise = getEffectiveExercise(entry.id);
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

  return (
    <div className="rounded-xl bg-bg-card px-5 py-5">
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
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                    bwMode ? "bg-bg-input text-text-muted" : "bg-accent-blue/12 text-accent-blue"
                  }`}
                >
                  {bwMode ? "+ Add Weight" : "BW Only"}
                </button>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => onSwap(exerciseIndex)}
              className="rounded-md bg-bg-input p-2 text-text-muted transition-colors active:bg-bg-card-hover"
              aria-label="Swap exercise"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
            <button
              onClick={() => setRemoveConfirm(!removeConfirm)}
              className="rounded-md bg-bg-input p-2 text-text-muted transition-colors active:bg-bg-card-hover"
              aria-label="Remove exercise"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {showOverloadBanner && overloadSuggestion && (
          <div
            className={`rounded-lg px-4 py-2.5 text-xs leading-relaxed ${
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
                  onChange={(e) => onSetChange(exerciseIndex, setIndex, "reps", parseInt(e.target.value) || 0)}
                  className="h-11 min-w-0 rounded-lg bg-bg-input px-2 text-center text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent-red"
                  placeholder="0"
                />
                <button
                  onClick={() => onSetChange(exerciseIndex, setIndex, "toFailure", !set.toFailure)}
                  className={`h-11 rounded-lg text-xs font-medium transition-colors ${set.toFailure ? "bg-accent-red/15 text-accent-red" : "bg-bg-input text-text-muted"}`}
                >
                  {set.toFailure ? "Yes" : "No"}
                </button>
                <button
                  onClick={() => onRemoveSet(exerciseIndex, setIndex)}
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
                  onChange={(e) => onSetChange(exerciseIndex, setIndex, "weight", parseFloat(e.target.value) || 0)}
                  className="h-11 min-w-0 rounded-lg bg-bg-input px-2 text-center text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent-red"
                  placeholder="0"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={set.reps || ""}
                  onChange={(e) => onSetChange(exerciseIndex, setIndex, "reps", parseInt(e.target.value) || 0)}
                  className="h-11 min-w-0 rounded-lg bg-bg-input px-2 text-center text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent-red"
                  placeholder="0"
                />
                <button
                  onClick={() => onSetChange(exerciseIndex, setIndex, "toFailure", !set.toFailure)}
                  className={`h-11 rounded-lg text-xs font-medium transition-colors ${set.toFailure ? "bg-accent-red/15 text-accent-red" : "bg-bg-input text-text-muted"}`}
                >
                  {set.toFailure ? "Yes" : "No"}
                </button>
                <button
                  onClick={() => onRemoveSet(exerciseIndex, setIndex)}
                  className={`h-11 text-lg text-text-dim ${entry.sets.length <= 1 ? "pointer-events-none opacity-20" : ""}`}
                  aria-label={`Remove set ${setIndex + 1}`}
                >
                  ×
                </button>
              </div>
            ),
          )}
        </div>

        {removeConfirm && (
          <div className="flex flex-col gap-3 rounded-lg bg-accent-red/8 p-4">
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
            className="flex-1 rounded-lg bg-bg-input py-3 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card-hover"
          >
            Add Set
          </button>

          {restButtons?.map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              className="rounded-lg bg-bg-input px-4 py-3 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card-hover"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
