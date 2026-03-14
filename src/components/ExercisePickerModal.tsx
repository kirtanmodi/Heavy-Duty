import { useState, useRef, useEffect } from "react";
import { getEffectiveExercises, exerciseGroups, muscleColors } from "../data/exercises";
import { useExerciseStore } from "../store/exerciseStore";
import type { Exercise, Equipment, MuscleGroup } from "../types";

const equipmentOptions: Equipment[] = [
  "barbell",
  "dumbbells",
  "cable",
  "machine",
  "bodyweight+",
];

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
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const allExercises = getEffectiveExercises();

  const candidates = allExercises.filter((e) => {
    if (mode === "swap" && e.id === currentExerciseId) return false;
    if (activeExerciseIds.includes(e.id)) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped: { label: string; exercises: Exercise[]; color: string }[] = [];
  for (const group of exerciseGroups) {
    const matches = candidates.filter((e) => e.primaryMuscles.some((m) => (group.muscles as readonly string[]).includes(m)));
    if (matches.length > 0) {
      grouped.push({ label: group.label, exercises: matches, color: muscleColors[group.muscles[0]] });
    }
  }

  const title = mode === "swap" ? "Swap Exercise" : "Add Exercise";
  const description = mode === "swap"
    ? "Choose a replacement for this slot or create a new exercise."
    : "Search your exercise list or create a new custom movement.";
  const emptyMessage = search
    ? "No exercises match your search."
    : mode === "swap"
      ? "No alternative exercises available."
      : "No exercises available to add.";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col animate-fade-in"
      style={{ background: "rgba(6,8,12,0.76)", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)" }}
    >
      <div
        className="px-5 pb-4"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
        }}
      >
        <div className="sheet-surface rounded-[1.75rem] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="section-label">{mode === "swap" ? "Replace Exercise" : "Add Exercise"}</p>
              <h2 className="mt-1 font-[var(--font-display)] text-2xl tracking-wider text-text-primary">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">{description}</p>
            </div>
            <button
              onClick={onClose}
              className="btn-ghost flex h-10 w-10 items-center justify-center"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="relative mt-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              inputMode="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="input-shell input-focus w-full rounded-2xl py-3 pl-11 pr-10 text-sm text-text-primary placeholder:text-text-dim outline-none"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full bg-white/[0.08] p-1 text-text-muted"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {candidates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-text-dim">
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <div className="flex max-w-[18rem] flex-col gap-1">
              <p className="text-sm font-semibold text-text-primary">{emptyMessage}</p>
              <p className="text-sm text-text-muted">
                Create a custom exercise if you do not see what you need.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-secondary mt-1 px-4 py-2 text-xs font-semibold"
            >
              Create new exercise
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5 pt-4">
            {grouped.map(({ label, exercises, color }) => (
              <div key={label} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-0.5">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                  <p className="text-[10px] font-bold tracking-[0.15em] text-text-muted uppercase">{label}</p>
                  <span className="text-[10px] text-text-dim">{exercises.length}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {exercises.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        if (mode === "swap" && onSelectWithAction) {
                          setSelectedExercise(e);
                        } else {
                          onSelect(e);
                        }
                      }}
                      className="relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.99]"
                      style={{
                        background: `linear-gradient(135deg, ${color}06 0%, transparent 50%)`,
                        border: `1px solid ${color}12`,
                      }}
                    >
                      {/* Color accent */}
                      <div
                        className="absolute left-0 top-0 h-full w-[3px]"
                        style={{ background: `linear-gradient(180deg, ${color}, ${color}30)` }}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pl-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-text-primary">{e.name}</span>
                          {e.type === "compound" && (
                            <span
                              className="rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-widest"
                              style={{ color, background: `${color}15` }}
                            >
                              C
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                            {e.equipment === "bodyweight+" ? "BW+" : e.equipment}
                          </span>
                          <span className="text-[11px] text-text-dim">
                            {e.repRange[0]}–{e.repRange[1]} reps
                          </span>
                        </div>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-text-dim">
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Create new exercise button */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] py-3.5 text-sm font-medium text-text-dim transition-colors active:bg-white/[0.05]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create New Exercise
            </button>
          </div>
        )}
      </div>

      {/* Action sheet for swap mode */}
      {selectedExercise && onSelectWithAction && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center animate-fade-in"
          style={{ background: "rgba(0,0,0,0.56)" }}
          onClick={() => setSelectedExercise(null)}
        >
          <div
            className="sheet-surface flex w-full max-w-[460px] flex-col gap-4 rounded-t-[1.9rem] p-5 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-text-primary truncate">{selectedExercise.name}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  onSelectWithAction(selectedExercise, "swap");
                  setSelectedExercise(null);
                }}
                className="rounded-xl bg-accent-red py-3 text-sm font-bold text-white transition-all active:scale-[0.97]"
              >
                Swap
              </button>
              <button
                onClick={() => {
                  onSelectWithAction(selectedExercise, "add");
                  setSelectedExercise(null);
                }}
                className="rounded-xl border border-white/[0.1] bg-transparent py-3 text-sm font-semibold text-text-primary transition-colors active:bg-white/[0.04]"
              >
                Add to Workout
              </button>
            </div>
            <button
              onClick={() => setSelectedExercise(null)}
              className="rounded-xl py-2.5 text-sm text-text-muted transition-colors active:bg-white/[0.04]"
            >
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

function CreateExerciseSheet({ onCreated, onClose }: { onCreated: (exercise: Exercise) => void; onClose: () => void }) {
  const { addExercise } = useExerciseStore();
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup>("chest");
  const [equipment, setEquipment] = useState<Equipment>("barbell");
  const inputRef = useRef<HTMLInputElement>(null);
  const color = muscleColors[muscle] || "#888";

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
        <div
          className="sheet-surface mx-auto max-w-[460px] rounded-t-[2rem] px-6 pt-5 pb-8"
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/[0.12]" />
          <p className="section-label">Create Custom Exercise</p>
          <h3 className="mt-1 mb-4 font-[var(--font-display)] text-xl tracking-wider text-text-primary">
            New Exercise
          </h3>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Name</label>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cable Lateral Raise"
                className="input-shell input-focus w-full rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-dim outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Muscle Group</label>
                <div className="relative">
                  <select
                    value={muscle}
                    onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
                    className="input-shell w-full appearance-none rounded-xl px-4 py-3 pr-8 text-sm text-text-primary outline-none"
                  >
                    {muscleOptions.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Equipment</label>
                <div className="relative">
                  <select
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value as Equipment)}
                    className="input-shell w-full appearance-none rounded-xl px-4 py-3 pr-8 text-sm text-text-primary outline-none"
                  >
                    {equipmentOptions.map((eq) => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {name.trim() && (
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 animate-fade-in"
                style={{ background: `${color}10`, border: `1px solid ${color}20` }}
              >
                <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span className="text-xs text-text-secondary">
                  {name.trim()} will appear under{" "}
                  <span style={{ color }}>{muscleOptions.find((m) => m.value === muscle)?.label}</span>
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
