import { useState } from "react";
import { getEffectiveExercises, exerciseGroups, muscleColors } from "../data/exercises";
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
                      onClick={() => onSelect(e)}
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
          </div>
        )}
      </div>
    </div>
  );
}
