import { useEffect, useRef, useState } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import {
  exerciseGroups,
  getEffectiveExercises,
  getEffectiveExercisesByGroup,
} from "../data/exercises";
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

function formatMuscle(muscle: string): string {
  return muscle
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function SelectChevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ExerciseRow({ exercise, isCustom }: { exercise: Exercise; isCustom: boolean }) {
  const { renameExercise, removeExercise } = useExerciseStore();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(exercise.name);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!confirmRemove) return;
    const id = setTimeout(() => setConfirmRemove(false), 2000);
    return () => clearTimeout(id);
  }, [confirmRemove]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== exercise.name) {
      renameExercise(exercise.id, trimmed);
    } else {
      setName(exercise.name);
    }
    setEditing(false);
  };

  const handleRemove = () => {
    if (confirmRemove) {
      removeExercise(exercise.id);
    } else {
      setConfirmRemove(true);
    }
  };

  const meta = [
    equipmentLabels[exercise.equipment] ?? exercise.equipment,
    `${exercise.repRange[0]}–${exercise.repRange[1]} reps`,
    exercise.type === "compound" ? "Compound" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const details = [
    exercise.primaryMuscles.map(formatMuscle).join(", "),
    `${exercise.restSeconds}s rest`,
    `+${exercise.weightIncrement}kg increments`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div className="flex min-h-[52px] items-center gap-1 pr-1.5">
        {/* Exercise info */}
        <div
          className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center gap-0.5 py-2.5 pl-4"
          onClick={() => !editing && setExpanded(!expanded)}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setName(exercise.name);
                  setEditing(false);
                }
              }}
              aria-label="Exercise name"
              className="input-shell input-focus -mb-0.5 -ml-3 -mt-2 h-8 w-[calc(100%+0.75rem)] px-3 text-[15px] font-medium text-text-primary"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[15px] font-medium leading-snug text-text-primary">
                {exercise.name}
              </span>
              {isCustom && (
                <span className="shrink-0 rounded-full bg-fill px-2 py-0.5 text-[12px] font-medium leading-tight text-text-muted">
                  Custom
                </span>
              )}
            </div>
          )}

          <p className="truncate text-[13px] text-text-muted">{meta}</p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-dim transition-colors active:bg-fill"
          aria-label={expanded ? "Hide exercise details" : "Show exercise details"}
          aria-expanded={expanded}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-[18px] w-[18px] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="flex flex-col gap-3 px-4 pb-4 animate-fade-in">
          <p className="text-[13px] leading-relaxed text-text-muted">{details}</p>

          {exercise.mentzerTips && (
            <div className="flex flex-col gap-1">
              <p className="text-[13px] font-medium text-text-muted">Mentzer tip</p>
              <p className="text-[14px] leading-relaxed text-text-secondary">
                {exercise.mentzerTips}
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="btn-secondary min-h-11 px-4 text-[14px]"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="btn-danger min-h-11 px-4 text-[14px]"
            >
              {confirmRemove ? "Confirm delete" : "Delete"}
            </button>
            {confirmRemove && (
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                className="btn-tertiary min-h-11 px-3 text-[14px]"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddExerciseSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const { addExercise } = useExerciseStore();
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup>("chest");
  const [equipment, setEquipment] = useState<Equipment>("barbell");

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
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet — sits above bottom nav (z-50) */}
      <div className="fixed inset-x-0 bottom-0 z-[70] animate-slide-up">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-exercise-title"
          className="sheet-surface mx-auto max-w-[460px] rounded-t-[1.25rem] border-b-0 px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        >
          {/* Handle */}
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-fill-strong" />

          <h2 id="new-exercise-title" className="section-title px-1">
            Add exercise
          </h2>

          <div className="mt-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="new-exercise-name" className="section-label px-1">
                Name
              </label>
              <input
                id="new-exercise-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cable Lateral Raise"
                className="input-shell input-focus h-12 w-full px-4 text-[15px] text-text-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="new-exercise-muscle" className="section-label px-1">
                  Muscle group
                </label>
                <div className="relative">
                  <select
                    id="new-exercise-muscle"
                    value={muscle}
                    onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
                    className="input-shell input-focus h-12 w-full appearance-none pl-4 pr-10 text-[15px] text-text-primary"
                  >
                    {muscleOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <SelectChevron />
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <label htmlFor="new-exercise-equipment" className="section-label px-1">
                  Equipment
                </label>
                <div className="relative">
                  <select
                    id="new-exercise-equipment"
                    value={equipment}
                    onChange={(e) =>
                      setEquipment(e.target.value as Equipment)
                    }
                    className="input-shell input-focus h-12 w-full appearance-none pl-4 pr-10 text-[15px] text-text-primary"
                  >
                    {equipmentOptions.map((eq) => (
                      <option key={eq} value={eq}>
                        {equipmentLabels[eq]}
                      </option>
                    ))}
                  </select>
                  <SelectChevron />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1 text-[15px]">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!name.trim()}
                className="btn-primary flex-1 text-[15px]"
              >
                Add exercise
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function Exercises() {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const { customExercises } = useExerciseStore();

  const allExercises = getEffectiveExercises();
  const customIds = new Set(customExercises.map((e) => e.id));

  const filteredExercises = search
    ? allExercises.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const groupsToShow = activeGroup
    ? exerciseGroups.filter((g) => g.label === activeGroup)
    : exerciseGroups;

  const totalCount = allExercises.length;

  return (
    <PageLayout className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <header className="flex items-center justify-between gap-3 px-1 pt-2">
          <div className="min-w-0">
            <h1 className="page-title">Exercises</h1>
            <p className="mt-1 text-[13px] tabular-nums text-text-muted">
              {totalCount} exercises
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="btn-icon shrink-0 text-text-primary"
            aria-label="Add exercise"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </header>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="text"
                inputMode="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value) setActiveGroup(null);
                }}
                placeholder="Search exercises"
                aria-label="Search exercises"
                className="input-shell input-focus h-11 w-full rounded-full pl-10 pr-11 text-[15px] text-text-primary placeholder:text-text-dim"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-text-muted"
                  aria-label="Clear search"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fill-strong">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="h-2.5 w-2.5"
                      aria-hidden="true"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </span>
                </button>
              )}
            </div>

            {/* Muscle filter toggle */}
            {!search && (
              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                aria-expanded={showFilters}
                className={`btn-secondary min-h-11 w-[7.5rem] shrink-0 gap-1.5 pl-3 pr-3.5 text-[14px] ${
                  showFilters || activeGroup ? "bg-fill-strong" : ""
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  className="h-[18px] w-[18px] shrink-0 text-text-secondary"
                  aria-hidden="true"
                >
                  <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
                  <circle cx="16" cy="7" r="2" />
                  <circle cx="10" cy="17" r="2" />
                </svg>
                <span className="truncate">
                  {showFilters ? "Hide" : activeGroup ?? "Filter"}
                </span>
                {activeGroup && !showFilters && (
                  <span className="sr-only">(filtered: {activeGroup})</span>
                )}
              </button>
            )}
          </div>

          {/* Muscle group filter chips */}
          {!search && showFilters && (
            <div className="scrollbar-hide -mx-[1.125rem] flex gap-2 overflow-x-auto px-[1.125rem] animate-fade-in">
              <button
                type="button"
                onClick={() => setActiveGroup(null)}
                aria-pressed={!activeGroup}
                className={`chip h-9 shrink-0 px-3.5 font-medium transition-colors ${
                  !activeGroup
                    ? "bg-[#f4f4f5] text-[#0b0b0c]"
                    : "text-text-secondary active:bg-fill-strong"
                }`}
              >
                All
              </button>
              {exerciseGroups.map((group) => {
                const isActive = activeGroup === group.label;
                const count = getEffectiveExercisesByGroup(group.label).length;
                if (count === 0) return null;

                return (
                  <button
                    key={group.label}
                    type="button"
                    onClick={() =>
                      setActiveGroup(isActive ? null : group.label)
                    }
                    aria-pressed={isActive}
                    className={`chip h-9 shrink-0 px-3.5 font-medium transition-colors ${
                      isActive
                        ? "bg-[#f4f4f5] text-[#0b0b0c]"
                        : "text-text-secondary active:bg-fill-strong"
                    }`}
                  >
                    {group.label}
                    <span
                      className={`tabular-nums ${
                        isActive ? "text-[#0b0b0c]/55" : "text-text-muted"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Exercise list */}
      {filteredExercises ? (
        filteredExercises.length > 0 ? (
          <section className="flex flex-col gap-2.5">
            <div className="flex min-h-6 items-center justify-between gap-3 px-1">
              <h2 className="section-label tabular-nums">
                {filteredExercises.length} result
                {filteredExercises.length !== 1 ? "s" : ""}
              </h2>
            </div>
            <div className="list-group">
              {filteredExercises.map((exercise) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  isCustom={customIds.has(exercise.id)}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 pt-10 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="h-7 w-7 text-text-muted"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <p className="section-title mt-1 max-w-full break-words">
              No exercises match &ldquo;{search}&rdquo;
            </p>
            <div className="mt-2 grid w-full max-w-[20rem] grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSearch("")}
                className="btn-secondary text-[15px]"
              >
                Clear search
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setShowAdd(true);
                }}
                className="btn-primary text-[15px]"
              >
                Create new
              </button>
            </div>
          </div>
        )
      ) : (
        groupsToShow.map((group) => {
          const groupExercises = getEffectiveExercisesByGroup(group.label);
          if (groupExercises.length === 0) return null;

          return (
            <section key={group.label} className="flex flex-col gap-2.5">
              <div className="flex min-h-6 items-center justify-between gap-3 px-1">
                <h2 className="section-label">{group.label}</h2>
                <span className="text-[13px] tabular-nums text-text-muted">
                  {groupExercises.length}
                </span>
              </div>
              <div className="list-group">
                {groupExercises.map((exercise) => (
                  <ExerciseRow
                    key={exercise.id}
                    exercise={exercise}
                    isCustom={customIds.has(exercise.id)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* Add exercise sheet */}
      {showAdd && <AddExerciseSheet onClose={() => setShowAdd(false)} />}
    </PageLayout>
  );
}
