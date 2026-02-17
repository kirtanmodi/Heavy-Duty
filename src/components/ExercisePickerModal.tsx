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
  const allExercises = getEffectiveExercises();

  const candidates = allExercises.filter((e) => {
    if (mode === "swap" && e.id === currentExerciseId) return false;
    if (activeExerciseIds.includes(e.id)) return false;
    return true;
  });

  const grouped: { label: string; exercises: Exercise[] }[] = [];
  for (const group of exerciseGroups) {
    const matches = candidates.filter((e) => e.primaryMuscles.some((m) => (group.muscles as readonly string[]).includes(m)));
    if (matches.length > 0) grouped.push({ label: group.label, exercises: matches });
  }

  const title = mode === "swap" ? "Swap Exercise" : "Add Exercise";
  const emptyMessage = mode === "swap" ? "No alternative exercises available." : "No exercises available to add.";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <h2 className="font-[var(--font-display)] text-2xl text-text-primary">{title}</h2>
        <button onClick={onClose} className="rounded-md bg-bg-input px-4 py-2 text-sm text-text-secondary">
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {candidates.length === 0 ? (
          <p className="pt-8 text-center text-sm text-text-muted">{emptyMessage}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(({ label, exercises }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">{label}</p>
                {exercises.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelect(e)}
                    className="flex flex-col gap-0.5 rounded-lg bg-bg-card px-4 py-3 text-left transition-colors active:bg-bg-card-hover"
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
