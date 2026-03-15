import { useEffect, useRef, useState } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import {
  exerciseGroups,
  getEffectiveExercises,
  getEffectiveExercisesByGroup,
  muscleColors,
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

const equipmentIcons: Record<Equipment, string> = {
  barbell: "B",
  dumbbells: "D",
  cable: "C",
  machine: "M",
  "bodyweight+": "BW",
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

function getGroupColor(exercise: Exercise): string {
  const primary = exercise.primaryMuscles[0];
  return muscleColors[primary] || "#888";
}

function EquipmentBadge({ equipment }: { equipment: Equipment }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
      <span className="text-[9px] opacity-70">{equipmentIcons[equipment]}</span>
      {equipment === "bodyweight+" ? "BW+" : equipment}
    </span>
  );
}

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const { renameExercise, removeExercise } = useExerciseStore();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(exercise.name);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const color = getGroupColor(exercise);

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

  return (
    <div
      className="group relative overflow-hidden rounded-2xl transition-all duration-200"
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, transparent 60%)`,
        border: `1px solid ${color}18`,
      }}
    >
      {/* Color accent bar */}
      <div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: `linear-gradient(180deg, ${color}, ${color}40)` }}
      />

      {/* Main content */}
      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start gap-3">
          {/* Exercise info */}
          <div
            className="flex min-w-0 flex-1 flex-col gap-1.5 cursor-pointer"
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
                className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-white/20"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-text-primary leading-tight">
                  {exercise.name}
                </span>
                {exercise.type === "compound" && (
                  <span
                    className="rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-widest"
                    style={{ color, background: `${color}15` }}
                  >
                    C
                  </span>
                )}
              </div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2">
              <EquipmentBadge equipment={exercise.equipment} />
              <span className="text-[11px] text-text-dim">
                {exercise.repRange[0]}–{exercise.repRange[1]} reps
              </span>
              <span className="text-[11px] text-text-dim">·</span>
              <span className="text-[11px] text-text-dim">
                {exercise.primaryMuscles
                  .map((m) =>
                    m
                      .split("-")
                      .map((w) => w[0].toUpperCase() + w.slice(1))
                      .join(" ")
                  )
                  .join(", ")}
              </span>
            </div>
          </div>

          <button
            onClick={() => setExpanded((value) => !value)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-dim transition-colors active:bg-white/[0.06]"
            aria-label={expanded ? "Hide exercise details" : "Show exercise details"}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Expandable details */}
        {expanded && (
          <div className="mt-3 animate-fade-in">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEditing(true)}
                className="btn-ghost px-3 py-2 text-xs font-semibold"
              >
                Rename
              </button>
              <button
                onClick={handleRemove}
                className={`px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  confirmRemove
                    ? "bg-accent-red/15 text-accent-red"
                    : "btn-ghost text-accent-red"
                }`}
              >
                {confirmRemove ? "Confirm Delete" : "Delete"}
              </button>
            </div>

            {exercise.mentzerTips && (
              <div
                className="mt-3 rounded-xl px-3 py-2.5"
                style={{ background: `${color}08`, border: `1px solid ${color}12` }}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" style={{ color }}>
                    <path
                      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                    Mentzer Tip
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-text-secondary">
                  {exercise.mentzerTips}
                </p>
              </div>
            )}

            <div className="mt-3 flex items-center gap-3 px-1">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3 w-3 text-text-dim">
                  <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] text-text-muted">
                  {exercise.restSeconds}s rest
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3 w-3 text-text-dim">
                  <path d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                </svg>
                <span className="text-[11px] text-text-muted">
                  +{exercise.weightIncrement}kg increments
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
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
  const color = muscleColors[muscle] || "#888";

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
          className="mx-auto max-w-[460px] rounded-t-3xl border-t border-white/[0.08] px-6 pt-5"
          style={{
            background: `linear-gradient(180deg, #1a1a20 0%, #111114 100%)`,
            paddingBottom: "calc(5rem + max(0.5rem, env(safe-area-inset-bottom)))",
          }}
        >
          {/* Handle */}
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/[0.12]" />

          <h3 className="mb-4 font-[var(--font-display)] text-xl tracking-wider text-text-primary">
            NEW EXERCISE
          </h3>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Name
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cable Lateral Raise"
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-white/20 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                  Muscle Group
                </label>
                <div className="relative">
                  <select
                    value={muscle}
                    onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
                    className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pr-8 text-sm text-text-primary outline-none"
                  >
                    {muscleOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                  Equipment
                </label>
                <div className="relative">
                  <select
                    value={equipment}
                    onChange={(e) =>
                      setEquipment(e.target.value as Equipment)
                    }
                    className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pr-8 text-sm text-text-primary outline-none"
                  >
                    {equipmentOptions.map((eq) => (
                      <option key={eq} value={eq}>
                        {eq}
                      </option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Preview pill */}
            {name.trim() && (
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 animate-fade-in"
                style={{ background: `${color}10`, border: `1px solid ${color}20` }}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: color }}
                />
                <span className="text-xs text-text-secondary">
                  {name.trim()} will appear under{" "}
                  <span style={{ color }}>
                    {muscleOptions.find((m) => m.value === muscle)?.label}
                  </span>
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={onClose}
                className="rounded-xl border border-white/[0.1] bg-transparent py-3 text-sm font-medium text-text-secondary transition-colors active:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!name.trim()}
                className="rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-30"
                style={{
                  background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                  boxShadow: `0 4px 16px ${color}30`,
                }}
              >
                Add Exercise
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
  useExerciseStore();

  const allExercises = getEffectiveExercises();

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
    <PageLayout className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-end justify-between pt-1">
        <div>
          <h1 className="font-[var(--font-display)] text-[2rem] leading-none tracking-wider text-text-primary">
            EXERCISES
          </h1>
          <p className="mt-1 text-[12px] text-text-dim">
            {totalCount} exercises in your library
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-red/15 text-accent-red transition-all active:scale-90"
          aria-label="Add exercise"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-5 w-5"
          >
            <path d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </header>

      {/* Search */}
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          inputMode="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value) setActiveGroup(null);
          }}
          placeholder="Search exercises..."
          className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] py-3 pl-11 pr-10 text-sm text-text-primary placeholder:text-text-dim outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.05]"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full bg-white/[0.08] p-1 text-text-muted"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-3 w-3"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {!search && (
        <div className="surface-card-muted rounded-[1.35rem] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {activeGroup ? `${activeGroup} exercises` : "All muscle groups"}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                Search is fastest. Open muscle filters only when you want to browse by category.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className="btn-ghost shrink-0 px-3 py-2 text-xs font-semibold"
            >
              {showFilters ? "Hide" : "Filter"}
            </button>
          </div>
        </div>
      )}

      {/* Muscle group filter chips */}
      {!search && showFilters && (
        <div className="scrollbar-hide -mx-2 flex gap-2 overflow-x-auto px-2 pb-1">
          <button
            onClick={() => setActiveGroup(null)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
              !activeGroup
                ? "bg-white/[0.12] text-text-primary"
                : "bg-white/[0.04] text-text-dim"
            }`}
          >
            All
          </button>
          {exerciseGroups.map((group) => {
            const groupColor = muscleColors[group.muscles[0]];
            const isActive = activeGroup === group.label;
            const count = getEffectiveExercisesByGroup(group.label).length;
            if (count === 0) return null;

            return (
              <button
                key={group.label}
                onClick={() =>
                  setActiveGroup(isActive ? null : group.label)
                }
                className="shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all"
                style={
                  isActive
                    ? {
                        background: `${groupColor}20`,
                        color: groupColor,
                        boxShadow: `0 0 12px ${groupColor}15`,
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        color: "var(--color-text-dim)",
                      }
                }
              >
                {group.label}
                <span
                  className="ml-1.5 text-[10px] opacity-60"
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Exercise list */}
      {filteredExercises ? (
        filteredExercises.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-text-dim">
              {filteredExercises.length} result
              {filteredExercises.length !== 1 ? "s" : ""}
            </p>
            {filteredExercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </div>
        ) : (
          <div className="surface-card flex flex-col items-center gap-4 rounded-[1.6rem] p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-6 w-6 text-text-dim"
              >
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <div className="flex max-w-[18rem] flex-col gap-2">
              <p className="text-sm font-semibold text-text-primary">No exercises match "{search}"</p>
              <p className="text-sm leading-relaxed text-text-muted">
                Clear the search to browse your full library, or create this as a new custom exercise.
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2">
              <button onClick={() => setSearch("")} className="btn-ghost py-3 text-sm font-semibold">
                Clear Search
              </button>
              <button
                onClick={() => {
                  setSearch("");
                  setShowAdd(true);
                }}
                className="btn-secondary py-3 text-sm font-semibold"
              >
                Create New
              </button>
            </div>
          </div>
        )
      ) : (
        groupsToShow.map((group) => {
          const groupExercises = getEffectiveExercisesByGroup(group.label);
          if (groupExercises.length === 0) return null;
          const groupColor = muscleColors[group.muscles[0]];

          return (
            <section key={group.label} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-0.5">
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: groupColor }}
                />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted">
                  {group.label}
                </h3>
                <span className="text-[10px] text-text-dim">
                  {groupExercises.length}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {groupExercises.map((exercise) => (
                  <ExerciseCard key={exercise.id} exercise={exercise} />
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
