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
  const emptyMessage = search
    ? "No exercises match your search."
    : mode === "swap"
      ? "No alternative exercises available."
      : "No exercises available to add.";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col animate-fade-in"
      style={{ background: "rgba(10,10,12,0.92)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
    >
      <div
        className="flex flex-col gap-3 px-5 pb-4"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-2xl tracking-wider text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-text-dim transition-colors active:bg-white/[0.06]"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
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
            className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] py-3 pl-11 pr-10 text-sm text-text-primary placeholder:text-text-dim outline-none transition-colors focus:border-white/[0.12] focus:bg-white/[0.05]"
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

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {candidates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-text-dim">
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="text-sm text-text-muted">{emptyMessage}</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-1 rounded-xl bg-white/[0.06] px-4 py-2 text-xs font-semibold text-text-secondary transition-colors active:bg-white/[0.1]"
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/[0.08] py-3.5 text-sm font-medium text-text-dim transition-colors active:bg-white/[0.03]"
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
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelectedExercise(null)}
        >
          <div
            className="w-full max-w-[460px] rounded-t-2xl bg-bg-card p-5 flex flex-col gap-4 animate-slide-up"
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
          className="mx-auto max-w-[460px] rounded-t-3xl border-t border-white/[0.08] px-6 pt-5 pb-8"
          style={{ background: "linear-gradient(180deg, #1a1a20 0%, #111114 100%)" }}
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/[0.12]" />
          <h3 className="mb-4 font-[var(--font-display)] text-xl tracking-wider text-text-primary">
            NEW EXERCISE
          </h3>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Name</label>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cable Lateral Raise"
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-white/20 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Muscle Group</label>
                <div className="relative">
                  <select
                    value={muscle}
                    onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
                    className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pr-8 text-sm text-text-primary outline-none"
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
                    className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pr-8 text-sm text-text-primary outline-none"
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
