import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExerciseCard } from "../components/ExerciseCard";
import { ExercisePickerModal } from "../components/ExercisePickerModal";
import { PageLayout } from "../components/layout/PageLayout";
import { useWorkoutStore } from "../store/workoutStore";
import type { Exercise, ExerciseEntry, SetEntry } from "../types";

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function HistoryEdit() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const history = useWorkoutStore((s) => s.history);
  const updateHistoryEntry = useWorkoutStore((s) => s.updateHistoryEntry);
  const deleteHistoryEntry = useWorkoutStore((s) => s.deleteHistoryEntry);

  const workout = history.find((w) => w.id === workoutId);

  const [exercises, setExercises] = useState<ExerciseEntry[]>(() =>
    workout ? workout.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })) : [],
  );
  const [swapTarget, setSwapTarget] = useState<number | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- Handlers ---

  const handleSetChange = (exIdx: number, setIdx: number, field: keyof SetEntry, value: number | boolean) => {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        const sets = e.sets.map((s, j) => (j === setIdx ? { ...s, [field]: value } : s));
        return { ...e, sets };
      }),
    );
  };

  const handleAddSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        const lastSet = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [...e.sets, { weight: lastSet?.weight ?? 0, reps: lastSet?.reps ?? 0, toFailure: false, tempo: "4-1-4" }],
        };
      }),
    );
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx || e.sets.length <= 1) return e;
        return { ...e, sets: e.sets.filter((_, j) => j !== setIdx) };
      }),
    );
  };

  const handleRemoveExercise = (exIdx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const handleSwap = (exercise: Exercise) => {
    if (swapTarget === null) return;
    setExercises((prev) =>
      prev.map((e, i) => (i === swapTarget ? { ...e, id: exercise.id, name: exercise.name } : e)),
    );
    setSwapTarget(null);
  };

  const handleAddExercise = (exercise: Exercise) => {
    setExercises((prev) => [
      ...prev,
      { id: exercise.id, name: exercise.name, sets: [{ weight: 0, reps: 0, toFailure: false, tempo: "4-1-4" }, { weight: 0, reps: 0, toFailure: false, tempo: "4-1-4" }] },
    ]);
    setShowAddExercise(false);
  };

  const handleSave = () => {
    if (!workoutId) return;
    const cleaned = exercises.filter((e) => e.sets.some((s) => s.reps > 0));
    updateHistoryEntry(workoutId, cleaned);
    navigate("/history");
  };

  const handleDelete = () => {
    if (!workoutId) return;
    deleteHistoryEntry(workoutId);
    navigate("/history");
  };

  const handleMoveGroup = (groupIndex: number, direction: "up" | "down") => {
    const targetGroupIndex = direction === "up" ? groupIndex - 1 : groupIndex + 1;
    if (targetGroupIndex < 0 || targetGroupIndex >= exercises.length) return;

    const newExercises = [...exercises];
    const temp = newExercises[groupIndex];
    newExercises[groupIndex] = newExercises[targetGroupIndex];
    newExercises[targetGroupIndex] = temp;
    setExercises(newExercises);
  };

  if (!workout) {
    return (
      <PageLayout withBottomNavPadding={false}>
        <div className="pt-20 text-center text-text-muted">Workout not found</div>
      </PageLayout>
    );
  }

  return (
    <>
      {/* Swap Exercise Modal */}
      {swapTarget !== null && (
        <ExercisePickerModal
          mode="swap"
          currentExerciseId={exercises[swapTarget]?.id ?? ""}
          activeExerciseIds={exercises.map((e) => e.id)}
          onSelect={handleSwap}
          onClose={() => setSwapTarget(null)}
        />
      )}

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <ExercisePickerModal
          mode="add"
          activeExerciseIds={exercises.map((e) => e.id)}
          onSelect={handleAddExercise}
          onClose={() => setShowAddExercise(false)}
        />
      )}

      <PageLayout withBottomNavPadding={false} className="flex flex-col gap-6">
        <header className="flex items-start justify-between gap-4 pt-1">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium tracking-widest text-text-muted uppercase">{formatRelativeDate(workout.date)}</p>
            <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-text-primary">{workout.day}</h1>
          </div>
          <button
            onClick={() => navigate("/history")}
            className="rounded-[8px] btn-ghost px-4 py-2 text-sm transition-colors"
          >
            Cancel
          </button>
        </header>

        {exercises.length === 0 && (
          <section className="rounded-[14px] bg-bg-card card-surface p-6 text-sm text-text-secondary">No exercises in this workout.</section>
        )}

        {exercises.map((entry, exIndex) => {
          const isFirst = exIndex === 0;
          const isLast = exIndex === exercises.length - 1;

          return (
            <section key={`s-${exIndex}`} className="flex flex-col gap-2">
              <div className="flex justify-end px-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveGroup(exIndex, "up")}
                    className={`rounded-md p-1.5 text-text-muted transition-colors active:bg-bg-input ${isFirst ? "pointer-events-none opacity-20" : ""}`}
                    aria-label="Move up"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveGroup(exIndex, "down")}
                    className={`rounded-md p-1.5 text-text-muted transition-colors active:bg-bg-input ${isLast ? "pointer-events-none opacity-20" : ""}`}
                    aria-label="Move down"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>
              </div>
              <ExerciseCard
                entry={entry}
                exerciseIndex={exIndex}
                onSetChange={handleSetChange}
                onAddSet={handleAddSet}
                onRemoveSet={handleRemoveSet}
                onSwap={(idx) => setSwapTarget(idx)}
                onRemove={handleRemoveExercise}
              />
            </section>
          );
        })}

        <button
          onClick={() => setShowAddExercise(true)}
          className="w-full rounded-[14px] border border-dashed border-border py-4 text-sm font-medium text-text-secondary transition-colors active:bg-bg-card"
        >
          + Add Exercise
        </button>

        <button onClick={handleSave} className="w-full rounded-[14px] btn-primary py-4 text-sm font-semibold tracking-wide text-white">
          Save Changes
        </button>

        {showDeleteConfirm ? (
          <div className="flex flex-col gap-3 rounded-[14px] border border-accent-red/15 bg-accent-red/8 p-5">
            <p className="text-sm text-text-secondary">Delete this workout permanently?</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={handleDelete} className="rounded-[10px] btn-primary py-3 text-sm font-semibold text-white">
                Delete
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="rounded-[10px] btn-ghost py-3 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full rounded-[10px] py-2.5 text-xs text-text-muted transition-colors active:text-accent-red"
          >
            Delete Workout
          </button>
        )}
      </PageLayout>
    </>
  );
}
