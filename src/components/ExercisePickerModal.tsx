import { useState, useRef, useEffect } from "react";
import { getEffectiveExercises, exerciseGroups } from "../data/exercises";
import { useExerciseStore } from "../store/exerciseStore";
import type { Exercise, Equipment, MuscleGroup } from "../types";

const equipmentOptions: Equipment[] = [
  "barbell",
  "dumbbells",
  "cable",
  "machine",
  "bodyweight+",
];

const equipmentLabels: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbells: "Dumbbells",
  cable: "Cable",
  machine: "Machine",
  "bodyweight+": "Bodyweight+",
};

const muscleOptions: { label: string; value: MuscleGroup }[] = [
  { label: "Chest", value: "chest" },
  { label: "Lats", value: "lats" },
  { label: "Mid Back", value: "mid-back" },
  { label: "Front Delts", value: "front-delts" },
  { label: "Side Delts", value: "side-delts" },
  { label: "Rear Delts", value: "rear-delts" },
  { label: "Biceps", value: "biceps" },
  { label: "Triceps", value: "triceps" },
  { label: "Traps", value: "traps" },
  { label: "Quads", value: "quads" },
  { label: "Hamstrings", value: "hamstrings" },
  { label: "Glutes", value: "glutes" },
  { label: "Calves", value: "calves" },
  { label: "Core", value: "core" },
];

interface ExercisePickerModalProps {
  mode: "swap" | "add";
  activeExerciseIds: string[];
  currentExerciseId?: string;
  onSelect: (exercise: Exercise) => void;
  onSelectWithAction?: (exercise: Exercise, action: "swap" | "add") => void;
  onClose: () => void;
}

export function ExercisePickerModal({ mode, activeExerciseIds, currentExerciseId, onSelect, onSelectWithAction, onClose }: ExercisePickerModalProps) {
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const allExercises = getEffectiveExercises();
  const groupMatches = (exercise: Exercise, muscles: readonly MuscleGroup[]) =>
    exercise.primaryMuscles.some((muscle) => muscles.includes(muscle));

  const availableCandidates = allExercises.filter((e) => {
    if (mode === "swap" && e.id === currentExerciseId) return false;
    if (activeExerciseIds.includes(e.id)) return false;
    return true;
  });

  const visibleGroups = exerciseGroups.filter((group) =>
    availableCandidates.some((exercise) => groupMatches(exercise, group.muscles as readonly MuscleGroup[])),
  );

  const resolvedActiveGroup =
    activeGroup !== "all" && !visibleGroups.some((group) => group.label === activeGroup)
      ? "all"
      : activeGroup;
  const selectedGroup = visibleGroups.find((group) => group.label === resolvedActiveGroup);
  const candidates = availableCandidates
    .filter((exercise) => {
      if (search && !exercise.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedGroup) {
        return groupMatches(exercise, selectedGroup.muscles as readonly MuscleGroup[]);
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const title = mode === "swap" ? "Swap exercise" : "Add exercise";
  const emptyMessage = search
    ? "No exercises match your search."
    : mode === "swap"
      ? "No alternative exercises available."
      : "No exercises available to add.";

  const chipClass = (active: boolean) =>
    `chip relative h-9 shrink-0 px-3.5 font-medium transition-colors after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] ${
      active ? "bg-[#f4f4f5] text-[#0b0b0c]" : "text-text-secondary active:bg-fill-strong"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary animate-fade-in">
      <div className="mx-auto flex min-h-0 w-full max-w-[460px] flex-1 flex-col">
        <header
          className="flex flex-col gap-3 border-b border-separator px-[1.125rem] pb-3"
          style={{ paddingTop: "max(1.25rem, calc(env(safe-area-inset-top) + 0.75rem))" }}
        >
          <div className="flex min-h-11 items-center justify-between gap-3 pl-1">
            <h2 className="section-title">{title}</h2>
            <button onClick={onClose} className="btn-icon shrink-0" aria-label="Close">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="text"
              inputMode="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises"
              className="input-shell input-focus h-11 w-full rounded-full pl-10 pr-11 text-[15px] text-text-primary placeholder:text-text-dim outline-none"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-text-muted"
                aria-label="Clear search"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fill-strong">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    className="h-3 w-3"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </span>
              </button>
            )}
          </div>

          {visibleGroups.length > 0 && (
            <div className="-mx-[1.125rem] -my-1 flex gap-2 overflow-x-auto px-[1.125rem] py-1 scrollbar-hide">
              <button onClick={() => setActiveGroup("all")} className={chipClass(resolvedActiveGroup === "all")}>
                All
              </button>
              {visibleGroups.map((group) => (
                <button
                  key={group.label}
                  onClick={() => setActiveGroup(group.label)}
                  className={chipClass(resolvedActiveGroup === group.label)}
                >
                  {group.label}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[1.125rem] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {candidates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 pt-12 text-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="h-7 w-7 text-text-muted"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <p className="section-title mt-1 max-w-[18rem]">{emptyMessage}</p>
              <button onClick={() => setShowCreate(true)} className="btn-secondary mt-3 px-5 text-[15px]">
                <PlusIcon />
                Create new exercise
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 pt-3">
              <p className="section-caption px-1 tabular-nums">{candidates.length} available</p>

              <div className="list-group">
                {candidates.map((exercise) => {
                  const groupLabel =
                    exerciseGroups.find((group) => groupMatches(exercise, group.muscles as readonly MuscleGroup[]))?.label ?? "Custom";

                  return (
                    <button
                      key={exercise.id}
                      onClick={() => {
                        if (mode === "swap" && onSelectWithAction) {
                          setSelectedExercise(exercise);
                        } else {
                          onSelect(exercise);
                        }
                      }}
                      className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-fill"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[15px] font-medium leading-snug text-text-primary">{exercise.name}</span>
                        <span className="truncate text-[13px] text-text-muted">
                          {groupLabel} · {equipmentLabels[exercise.equipment]} · {exercise.repRange[0]}–{exercise.repRange[1]} reps
                          {exercise.type === "compound" && " · Compound"}
                        </span>
                      </div>
                      {mode === "add" ? (
                        <span className="shrink-0 text-text-muted">
                          <PlusIcon />
                        </span>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-[18px] w-[18px] shrink-0 text-text-dim"
                        >
                          <path d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              <button onClick={() => setShowCreate(true)} className="btn-secondary mt-2 w-full text-[15px]">
                <PlusIcon />
                Create new exercise
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action sheet for swap mode */}
      {selectedExercise && onSelectWithAction && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 animate-fade-in"
          onClick={() => setSelectedExercise(null)}
        >
          <div
            className="sheet-surface flex w-full max-w-[460px] flex-col gap-2 rounded-t-[1.25rem] border-b-0 px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-fill-strong" />
            <p className="section-title mb-2 truncate px-1">{selectedExercise.name}</p>
            <button
              onClick={() => {
                onSelectWithAction(selectedExercise, "swap");
                setSelectedExercise(null);
              }}
              className="btn-primary w-full text-[15px]"
            >
              Swap
            </button>
            <button
              onClick={() => {
                onSelectWithAction(selectedExercise, "add");
                setSelectedExercise(null);
              }}
              className="btn-secondary w-full text-[15px]"
            >
              Add to workout
            </button>
            <button onClick={() => setSelectedExercise(null)} className="btn-tertiary w-full text-[15px]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Create new exercise sheet */}
      {showCreate && (
        <CreateExerciseSheet
          onCreated={(exercise) => {
            setShowCreate(false);
            if (mode === "swap" && onSelectWithAction) {
              setSelectedExercise(exercise);
            } else {
              onSelect(exercise);
            }
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      className="h-[18px] w-[18px]"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CreateExerciseSheet({ onCreated, onClose }: { onCreated: (exercise: Exercise) => void; onClose: () => void }) {
  const { addExercise } = useExerciseStore();
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup>("chest");
  const [equipment, setEquipment] = useState<Equipment>("barbell");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const exercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      equipment,
      type: "isolation",
      primaryMuscles: [muscle],
      secondaryMuscles: [],
      mentzerTips: "",
      repRange: [8, 10],
      restSeconds: 60,
      weightIncrement: 2,
    };

    addExercise(exercise);
    onCreated(exercise);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/60 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[70] animate-slide-up">
        <div className="sheet-surface mx-auto max-w-[460px] rounded-t-[1.25rem] border-b-0 px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-fill-strong" />
          <h3 className="section-title mb-4 px-1">New exercise</h3>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="picker-new-exercise-name" className="section-label px-1">Name</label>
              <input
                id="picker-new-exercise-name"
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cable Lateral Raise"
                className="input-shell input-focus h-12 w-full px-4 text-[15px] text-text-primary placeholder:text-text-dim outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="picker-new-exercise-muscle" className="section-label px-1">Muscle group</label>
                <div className="relative">
                  <select
                    id="picker-new-exercise-muscle"
                    value={muscle}
                    onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
                    className="input-shell input-focus h-12 w-full appearance-none px-4 pr-9 text-[15px] text-text-primary outline-none"
                  >
                    {muscleOptions.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="picker-new-exercise-equipment" className="section-label px-1">Equipment</label>
                <div className="relative">
                  <select
                    id="picker-new-exercise-equipment"
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value as Equipment)}
                    className="input-shell input-focus h-12 w-full appearance-none px-4 pr-9 text-[15px] text-text-primary outline-none"
                  >
                    {equipmentOptions.map((eq) => (
                      <option key={eq} value={eq}>{equipmentLabels[eq]}</option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={onClose} className="btn-secondary text-[15px]">
                Cancel
              </button>
              <button onClick={handleAdd} disabled={!name.trim()} className="btn-primary text-[15px]">
                Add exercise
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
