import { useState } from "react";
import { getEffectiveExercises, exerciseGroups } from "../data/exercises";
import type { Exercise } from "../types";

interface ExercisePickerModalProps {
  mode: "swap" | "add";
  activeExerciseIds: string[];
  currentExerciseId?: string;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePickerModal({ mode, activeExerciseIds, currentExerciseId, onSelect, onClose }: ExercisePickerModalProps) {
  const [search, setSearch] = useState("");
  const allExercises = getEffectiveExercises();

  const candidates = allExercises.filter((e) => {
    if (mode === "swap" && e.id === currentExerciseId) return false;
    if (activeExerciseIds.includes(e.id)) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped: { label: string; exercises: Exercise[] }[] = [];
  for (const group of exerciseGroups) {
    const matches = candidates.filter((e) => e.primaryMuscles.some((m) => (group.muscles as readonly string[]).includes(m)));
    if (matches.length > 0) grouped.push({ label: group.label, exercises: matches });
  }

  const title = mode === "swap" ? "Swap Exercise" : "Add Exercise";
  const emptyMessage = search
    ? "No exercises match your search."
    : mode === "swap"
      ? "No alternative exercises available."
      : "No exercises available to add.";

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-fade-in" style={{ background: 'rgba(10,10,12,0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="flex flex-col gap-3 border-b border-border px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <h2 className="font-[var(--font-display)] text-2xl text-text-primary">{title}</h2>
          <button onClick={onClose} className="rounded-[8px] btn-ghost px-4 py-2 text-sm">
            Cancel
          </button>
        </div>
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            inputMode="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full rounded-[10px] border border-border-card bg-bg-input py-2.5 pl-10 pr-9 text-sm text-text-primary placeholder:text-text-dim outline-none input-focus"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {candidates.length === 0 ? (
          <p className="pt-8 text-center text-sm text-text-muted">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col gap-4 pt-4">
            {grouped.map(({ label, exercises }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">{label}</p>
                {exercises.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelect(e)}
                    className="flex flex-col gap-0.5 rounded-[10px] bg-bg-card card-surface px-4 py-3 text-left transition-colors active:bg-bg-card-hover"
                  >
                    <span className="text-sm font-medium text-text-primary">{e.name}</span>
                    <span className="text-xs text-text-muted">
                      {e.equipment === "bodyweight+" ? "bodyweight" : e.equipment} · {e.repRange[0]}-{e.repRange[1]} reps
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
