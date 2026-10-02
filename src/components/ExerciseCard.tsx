import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { getEffectiveExercise } from "../data/exercises";
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
  mode?: "workout" | "history-edit";
  entry: ExerciseEntry;
  exerciseIndex: number;
  onSetChange: (exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: number | boolean) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onSwap: (exerciseIndex: number) => void;
  onRemove: (exerciseIndex: number) => void;
  onAutoReplace?: (exerciseIndex: number) => void;
  onBackOff?: (exerciseIndex: number) => void;
  canBackOff?: boolean;
  onSkip?: (exerciseIndex: number) => void;
  onUnskip?: (exerciseIndex: number) => void;
  onSetComplete?: (exerciseIndex: number) => void;
  showOverloadBanner?: boolean;
  overloadSuggestion?: OverloadSuggestion;
  restButtons?: RestButton[];
  previousSets?: SetEntry[];
}

const EQUIPMENT_OPTIONS: Equipment[] = ["barbell", "dumbbells", "cable", "machine", "bodyweight+"];

const formatEquipment = (eq: Equipment) =>
  eq === "bodyweight+" ? "BW+" : eq.charAt(0).toUpperCase() + eq.slice(1);

/* ---------- Small presentational pieces ---------- */

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MoreButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`btn-icon transition-colors ${
        open ? "bg-fill text-text-primary" : "bg-transparent text-text-muted active:bg-fill"
      }`}
      aria-label="Exercise options"
      aria-expanded={open}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <circle cx="5.5" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="18.5" cy="12" r="1.6" />
      </svg>
    </button>
  );
}

function MenuPanel({ children, up = false }: { children: ReactNode; up?: boolean }) {
  return (
    <div
      className={`sheet-surface absolute right-0 z-50 w-56 overflow-hidden rounded-[0.875rem] py-1 animate-fade-in ${
        up ? "bottom-full mb-1" : "top-full mt-1"
      }`}
    >
      {children}
    </div>
  );
}

function MenuItem({
  onClick,
  icon,
  children,
  danger = false,
  disabled = false,
}: {
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-11 w-full items-center gap-3 px-4 text-left text-[15px] transition-colors ${
        disabled
          ? "cursor-not-allowed text-text-dim"
          : `active:bg-fill ${danger ? "text-accent-red" : "text-text-primary"}`
      }`}
    >
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center ${
          disabled ? "opacity-60" : danger ? "" : "text-text-secondary"
        }`}
      >
        {icon}
      </span>
      {children}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 h-px bg-separator" />;
}

const SwapIcon = () => (
  <svg {...iconProps} className="h-[18px] w-[18px]">
    <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const ShuffleIcon = () => (
  <svg {...iconProps} className="h-[18px] w-[18px]">
    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
);

const BackOffIcon = () => (
  <svg {...iconProps} className="h-[18px] w-[18px]">
    <path d="M12 5v14m0 0l-5-5m5 5l5-5" />
  </svg>
);

const SkipIcon = () => (
  <svg {...iconProps} className="h-[18px] w-[18px]">
    <path d="M5 5l10 7-10 7V5zM19 5v14" />
  </svg>
);

const UnskipIcon = () => (
  <svg {...iconProps} className="h-[18px] w-[18px]">
    <path d="M9 12l2 2 4-4" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const ToolsIcon = () => (
  <svg {...iconProps} className="h-[18px] w-[18px]">
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </svg>
);

const TrashIcon = () => (
  <svg {...iconProps} className="h-[18px] w-[18px]">
    <path d="M4 7h16M10 11v6m4-6v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
  </svg>
);

function RemoveConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      <p className="text-[15px] font-semibold text-text-primary">Remove this exercise?</p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onConfirm} className="btn-danger min-h-11 px-4 text-[14px]">
          Remove
        </button>
        <button onClick={onCancel} className="btn-secondary min-h-11 px-4 text-[14px]">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ExerciseCard({
  mode = "workout",
  entry,
  exerciseIndex,
  onSetChange,
  onAddSet,
  onRemoveSet,
  onSwap,
  onRemove,
  onAutoReplace,
  onBackOff,
  canBackOff = false,
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
  // Label sets by role (warm-up vs working) whenever the entry carries working-set flags
  const hasWorkingSetFlags = entry.sets.some((set) => set.toFailure);
  const [showMenu, setShowMenu] = useState(false);
  const [menuUp, setMenuUp] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
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

  const isHistoryEdit = mode === "history-edit";

  // Open the overflow menu upward when its trigger sits in the lower part of the screen,
  // so it stays clear of the floating bottom bar.
  const toggleMenu = () => {
    if (!showMenu && menuRef.current) {
      setMenuUp(menuRef.current.getBoundingClientRect().bottom > window.innerHeight * 0.55);
    }
    setShowMenu(!showMenu);
  };

  // Cards carry no z-index: they must not form a stacking context, so an open menu panel's
  // z-50 layers above sibling cards and the floating bottom bar (z-40) without lifting the card.

  // Collapsed skipped render
  if (entry.skipped) {
    return (
      <div className="surface-card-muted relative rounded-[1.25rem]">
        <div className="flex min-h-14 items-center gap-2.5 py-1.5 pl-4 pr-1.5">
          <h2 className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-text-muted">{entry.name}</h2>
          <span className="shrink-0 rounded-full bg-fill px-2 py-0.5 text-[12px] font-medium leading-tight text-text-muted">
            Skipped
          </span>
          <div className="relative shrink-0" ref={menuRef}>
            <MoreButton open={showMenu} onClick={toggleMenu} />
            {showMenu && (
              <MenuPanel up={menuUp}>
                {onUnskip && (
                  <MenuItem
                    onClick={() => { onUnskip(exerciseIndex); setShowMenu(false); }}
                    icon={<UnskipIcon />}
                  >
                    Unskip
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => { onSwap(exerciseIndex); setShowMenu(false); }}
                  icon={<SwapIcon />}
                >
                  Swap exercise
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  onClick={() => { setRemoveConfirm(true); setShowMenu(false); }}
                  icon={<TrashIcon />}
                  danger
                >
                  Remove
                </MenuItem>
              </MenuPanel>
            )}
          </div>
        </div>
        {removeConfirm && (
          <div className="border-t border-separator px-4 pb-4 pt-3">
            <RemoveConfirm
              onConfirm={() => { onRemove(exerciseIndex); setRemoveConfirm(false); }}
              onCancel={() => setRemoveConfirm(false)}
            />
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
  const equipmentLabel = formatEquipment(exercise.equipment);
  const toolsLabel = showDetails ? "Done editing" : "Edit sets & equipment";

  const getSetPR = (set: SetEntry, setIndex: number) => {
    if (!showOverloadBanner) return null;
    if (!isSetComplete(set, setIndex)) return null;
    if (set.reps === 0) return null;
    const pr = checkPR(entry.id, set, history);
    return hasPR(pr) ? getPRLabel(pr) : null;
  };

  const overloadDotClass =
    overloadSuggestion?.type === "increase"
      ? "bg-accent-green"
      : overloadSuggestion?.type === "decrease"
        ? "bg-accent-orange"
        : overloadSuggestion?.type === "testing"
          ? "bg-accent-blue"
          : "bg-text-muted";

  // Set removal lives behind the edit disclosure mid-workout; the history edit screen is
  // already an editing context, so it stays visible there.
  const showSetRemoval = showDetails || isHistoryEdit;

  // Shared column template keeps the header row and every set row aligned. The right-hand
  // columns (Fail, remove) are identical in both templates so stacked cards line up.
  const gridCols = bwMode
    ? showSetRemoval
      ? "grid-cols-[2rem_minmax(0,1fr)_2.5rem_1rem]"
      : "grid-cols-[2rem_minmax(0,1fr)_2.5rem]"
    : showSetRemoval
      ? "grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem_1rem]"
      : "grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem]";
  // A tighter gap while the remove column is showing keeps 5-character weights legible.
  const gridGap = showSetRemoval ? "gap-x-1" : "gap-x-1.5";

  return (
    <div className="surface-card relative rounded-[1.25rem] p-4">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="section-title">{entry.name}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-text-muted">
              <button
                onClick={() => setShowDetails((prev) => !prev)}
                className={`chip chip-muted relative min-h-8 gap-1 py-0 pl-2.5 pr-2 text-[12px] font-medium transition-colors after:absolute after:-inset-x-1 after:-inset-y-1.5 after:content-[''] ${
                  showDetails ? "bg-fill-strong text-text-primary" : "text-text-secondary active:bg-fill-strong"
                }`}
                aria-expanded={showDetails}
                aria-label={`Equipment: ${equipmentLabel}. ${toolsLabel}`}
              >
                {equipmentLabel}
                <svg
                  {...iconProps}
                  strokeWidth={2}
                  className={`h-3 w-3 text-text-muted transition-transform ${showDetails ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <span className="ml-0.5">
                {exercise.repRange[0]}–{exercise.repRange[1]} reps
              </span>
              {exercise.type === "compound" && (
                <>
                  <span aria-hidden className="text-text-dim">·</span>
                  <span>Compound</span>
                </>
              )}
              {isBwExercise && (
                <>
                  <span aria-hidden className="text-text-dim">·</span>
                  <span>{bwMode ? "BW only" : "+ weight"}</span>
                </>
              )}
              {showOverloadBanner && totalSets > 0 && (
                <>
                  <span aria-hidden className="text-text-dim">·</span>
                  <span className={`tabular-nums ${completedCount === totalSets ? "text-accent-green" : ""}`}>
                    {completedCount}/{totalSets}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Context menu */}
          <div className="relative -mr-2 -mt-1.5 shrink-0" ref={menuRef}>
            <MoreButton open={showMenu} onClick={toggleMenu} />
            {showMenu && (
              <MenuPanel up={menuUp}>
                <MenuItem
                  onClick={() => { onSwap(exerciseIndex); setShowMenu(false); }}
                  icon={<SwapIcon />}
                >
                  Swap exercise
                </MenuItem>
                {onAutoReplace && (
                  <MenuItem
                    onClick={() => { onAutoReplace(exerciseIndex); setShowMenu(false); }}
                    icon={<ShuffleIcon />}
                  >
                    Auto replace
                  </MenuItem>
                )}
                {onBackOff && (
                  <MenuItem
                    onClick={() => {
                      if (!canBackOff) return;
                      onBackOff(exerciseIndex);
                      setShowMenu(false);
                    }}
                    disabled={!canBackOff}
                    icon={<BackOffIcon />}
                  >
                    Back off
                  </MenuItem>
                )}
                {onSkip && (
                  <MenuItem
                    onClick={() => { onSkip(exerciseIndex); setShowMenu(false); }}
                    icon={<SkipIcon />}
                  >
                    Skip this week
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => { setShowDetails((prev) => !prev); setShowMenu(false); }}
                  icon={<ToolsIcon />}
                >
                  {toolsLabel}
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  onClick={() => { setRemoveConfirm(true); setShowMenu(false); }}
                  icon={<TrashIcon />}
                  danger
                >
                  Remove
                </MenuItem>
              </MenuPanel>
            )}
          </div>
        </div>

        {/* Exercise tools: equipment + bodyweight logging mode */}
        {showDetails && (
          <div className="-mt-1 flex flex-col gap-3 animate-fade-in">
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const isActive = exercise.equipment === eq;
                const hasOverride = !!equipmentOverride[entry.id];
                return (
                  <button
                    key={eq}
                    onClick={() => {
                      setEquipmentOverride(entry.id, eq);
                      setWeightOverride(undefined);
                    }}
                    aria-pressed={isActive}
                    className={`chip h-9 shrink-0 px-3.5 font-medium transition-colors ${
                      isActive ? "bg-[#f4f4f5] text-[#0b0b0c]" : "text-text-secondary active:bg-fill-strong"
                    }`}
                  >
                    {/* A blue dot marks equipment switched away from the exercise's default. */}
                    {isActive && hasOverride && (
                      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-blue" />
                    )}
                    {formatEquipment(eq)}
                  </button>
                );
              })}
            </div>

            {isBwExercise && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-text-muted">
                  {bwMode ? "Logging bodyweight only" : "Logging added weight"}
                </span>
                <button
                  onClick={toggleWeightMode}
                  className="btn-secondary min-h-11 shrink-0 px-4 text-[14px]"
                >
                  {bwMode ? "Add weight" : "BW only"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Overload suggestion */}
        {showOverloadBanner && overloadSuggestion && (
          <div className="-mt-1 flex items-start gap-2.5 text-[13px] leading-relaxed">
            <span aria-hidden className={`mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full ${overloadDotClass}`} />
            <p className="min-w-0 text-text-secondary">
              <span className="font-medium text-text-primary">
                {overloadSuggestion.type === "increase"
                  ? bwMode ? "Reps maxed" : "Weight up"
                  : overloadSuggestion.type === "decrease"
                    ? "Weight down"
                    : overloadSuggestion.type === "testing"
                      ? "Testing"
                      : "Building reps"}
              </span>
              <span aria-hidden className="mx-1.5 text-text-dim">·</span>
              {overloadSuggestion.message}
            </p>
          </div>
        )}

        {/* Set inputs */}
        <div className="flex flex-col gap-1.5">
          <div className={`grid ${gridCols} ${gridGap} items-center text-[12px] text-text-muted`}>
            <span className="text-center">Set</span>
            {!bwMode && <span className="text-center">kg</span>}
            <span className="text-center">Reps</span>
            <span className="text-center">Fail</span>
            {showSetRemoval && <span />}
          </div>

          {entry.sets.map((set, setIndex) => {
            const completed = isSetComplete(set, setIndex);
            const prevSet = previousSets?.[setIndex];
            const prLabel = getSetPR(set, setIndex);
            const isWorkingSet = entry.sets[setIndex].toFailure;
            const workingNumber = entry.sets.slice(0, setIndex + 1).filter((s) => s.toFailure).length;
            const showRoleLabel = hasWorkingSetFlags && !completed;
            const setLabel = showRoleLabel ? (isWorkingSet ? String(workingNumber) : "W") : String(setIndex + 1);
            const setDescription = hasWorkingSetFlags
              ? isWorkingSet ? `working set ${workingNumber}` : "warm-up set"
              : `set ${setIndex + 1}`;

            return (
              <div key={setIndex} className="flex flex-col">
                <div className={`grid ${gridCols} ${gridGap} items-start`}>
                  <button
                    onClick={() => toggleSetComplete(setIndex)}
                    className="-ml-3 flex h-12 w-[calc(100%+0.75rem)] items-center justify-end"
                    aria-pressed={completed}
                    aria-label={`Mark ${setDescription} complete`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums transition-colors ${
                        completedSets.has(setIndex)
                          ? "bg-accent-green/15 text-accent-green"
                          : `bg-fill ring-1 ring-inset ring-white/[0.08] ${
                              completed
                                ? "text-text-secondary"
                                : showRoleLabel && !isWorkingSet
                                  ? "text-text-muted"
                                  : "text-text-primary"
                            }`
                      }`}
                    >
                      {completed ? (
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                          <path d="M6.5 12.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        setLabel
                      )}
                    </span>
                  </button>
                  {!bwMode && (
                    <StepperInput
                      value={set.weight}
                      onChange={(v) => onSetChange(exerciseIndex, setIndex, "weight", v)}
                      step={exercise.weightIncrement}
                      inputMode="decimal"
                      prevHint={prevSet ? `prev: ${prevSet.weight}kg` : undefined}
                      onPrevTap={prevSet ? () => onSetChange(exerciseIndex, setIndex, "weight", prevSet.weight) : undefined}
                    />
                  )}
                  <StepperInput
                    value={set.reps}
                    onChange={(v) => onSetChange(exerciseIndex, setIndex, "reps", v)}
                    step={1}
                    prevHint={prevSet ? `prev: ${prevSet.reps}` : undefined}
                    onPrevTap={prevSet ? () => onSetChange(exerciseIndex, setIndex, "reps", prevSet.reps) : undefined}
                  />
                  <button
                    onClick={() => onSetChange(exerciseIndex, setIndex, "toFailure", !set.toFailure)}
                    className={`h-12 w-full rounded-[0.875rem] text-[13px] font-semibold transition-colors ${
                      set.toFailure
                        ? "bg-fill-strong text-text-primary"
                        : "bg-transparent text-text-dim ring-1 ring-inset ring-white/[0.06]"
                    }`}
                    aria-pressed={set.toFailure}
                    aria-label={`Set ${setIndex + 1} to failure`}
                  >
                    {set.toFailure ? "F" : "—"}
                  </button>
                  {showSetRemoval && (
                    <button
                      onClick={() => onRemoveSet(exerciseIndex, setIndex)}
                      className={`-mr-4 flex h-12 w-[calc(100%+1rem)] items-center justify-start pl-px text-text-muted transition-colors active:text-text-primary ${
                        entry.sets.length <= 1 ? "pointer-events-none opacity-30" : ""
                      }`}
                      aria-label={`Remove set ${setIndex + 1}`}
                    >
                      <svg {...iconProps} strokeWidth={2} className="h-3.5 w-3.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {prLabel && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 600, damping: 20 }}
                      className={`mb-1 mt-0.5 inline-block ${showSetRemoval ? "ml-9" : "ml-[2.375rem]"} self-start rounded-full bg-accent-red/12 px-2 py-0.5 text-[12px] font-medium leading-tight text-accent-red`}
                    >
                      {prLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="-mb-1.5 -mt-1 flex items-center justify-between gap-2">
          <button
            onClick={() => onAddSet(exerciseIndex)}
            className="btn-tertiary -ml-3 px-3 text-[14px] active:text-text-primary"
          >
            <svg {...iconProps} strokeWidth={2} className="h-4 w-4">
              <path d="M12 5v14m7-7H5" />
            </svg>
            Add set
          </button>

          {restButtons && restButtons.length > 0 && (
            <div className="flex items-center gap-2">
              {restButtons.map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.onClick}
                  className="btn-secondary min-h-11 px-3.5 text-[14px] tabular-nums"
                >
                  <svg {...iconProps} className="h-4 w-4 text-text-secondary">
                    <circle cx="12" cy="13" r="8" />
                    <path d="M12 9v4l2.5 2M10 2h4" />
                  </svg>
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Remove confirm */}
        {removeConfirm && (
          <div className="border-t border-separator pt-3">
            <RemoveConfirm onConfirm={handleRemoveConfirmed} onCancel={() => setRemoveConfirm(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
