import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExerciseCard } from "../components/ExerciseCard";
import { ExercisePickerModal } from "../components/ExercisePickerModal";
import { PageLayout } from "../components/layout/PageLayout";
import { useWorkoutStore } from "../store/workoutStore";
import type { Exercise, ExerciseEntry, SetEntry } from "../types";
import { formatRelativeDate } from "../lib/dates";

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

  const totalSetCount = exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const workoutTypeLabel = (() => {
    const dayType = workout.dayType ?? "lift";
    if (dayType === "lift") return workout.dayId === "open" ? "Open workout" : "Lift workout";
    return `${dayType.charAt(0).toUpperCase()}${dayType.slice(1)} log`;
  })();

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

      <PageLayout withBottomNavPadding={false} className="flex flex-col gap-5 pb-28">
        <header className="surface-card rounded-[1.75rem] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="section-label">Edit Logged Workout</p>
              <h1 className="mt-1 font-[var(--font-display)] text-4xl tracking-wide text-text-primary">{workout.day}</h1>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">
                Adjust the saved sets, reorder exercises, or swap movements before saving the updated session.
              </p>
            </div>
            <button
              onClick={() => navigate("/history")}
              className="btn-ghost shrink-0 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip chip-muted px-3 py-2 text-[11px] font-semibold text-text-secondary">
              {formatRelativeDate(workout.date)}
            </span>
            <span className="chip chip-muted px-3 py-2 text-[11px] font-semibold text-text-secondary">
              {workoutTypeLabel}
            </span>
            <span className="chip chip-muted px-3 py-2 text-[11px] font-semibold text-text-secondary">
              {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
            </span>
            <span className="chip chip-muted px-3 py-2 text-[11px] font-semibold text-text-secondary">
              {totalSetCount} set{totalSetCount !== 1 ? "s" : ""}
            </span>
          </div>
        </header>

        {exercises.length === 0 ? (
          <section className="surface-card flex flex-col items-center gap-4 rounded-[1.6rem] p-7 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/[0.04]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6 text-text-dim">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex max-w-[18rem] flex-col gap-2">
              <p className="font-semibold text-text-primary">No exercises in this workout</p>
              <p className="text-sm leading-relaxed text-text-muted">
                Add an exercise if you want this logged session to include set details.
              </p>
            </div>
            <button onClick={() => setShowAddExercise(true)} className="btn-secondary px-5 py-3 text-sm font-semibold">
              Add Exercise
            </button>
          </section>
        ) : (
          <div className="flex flex-col gap-4">
            {exercises.map((entry, exIndex) => {
              const isFirst = exIndex === 0;
              const isLast = exIndex === exercises.length - 1;

              return (
                <section key={`s-${exIndex}`} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 px-1">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[11px] font-semibold tabular-nums text-text-secondary">
                        {String(exIndex + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-dim">
                          Exercise {exIndex + 1}
                        </p>
                        <p className="text-[12px] text-text-muted">Move this block up or down in the saved order.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveGroup(exIndex, "up")}
                        className={`btn-ghost flex h-10 w-10 items-center justify-center ${isFirst ? "pointer-events-none opacity-20" : ""}`}
                        aria-label="Move up"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                          <path d="M18 15l-6-6-6 6" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveGroup(exIndex, "down")}
                        className={`btn-ghost flex h-10 w-10 items-center justify-center ${isLast ? "pointer-events-none opacity-20" : ""}`}
                        aria-label="Move down"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <ExerciseCard
                    mode="history-edit"
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
          </div>
        )}

        <button
          onClick={() => setShowAddExercise(true)}
          className="w-full rounded-[1.45rem] border border-dashed border-white/[0.1] bg-white/[0.03] py-4 text-sm font-medium text-text-secondary transition-colors active:bg-white/[0.05]"
        >
          + Add Exercise
        </button>

        <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 mt-1">
          <section className="glass rounded-[1.6rem] p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">Save this workout</p>
                <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
                  Changes apply to this logged session only. Exercises without reps are removed on save.
                </p>
              </div>
              <span className="chip chip-muted shrink-0 px-3 py-2 text-[11px] font-semibold text-text-secondary">
                {exercises.length} items
              </span>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <button onClick={() => setShowAddExercise(true)} className="btn-ghost px-4 py-3 text-sm font-semibold">
                Add Exercise
              </button>
              <button onClick={handleSave} className="btn-primary px-5 py-3 text-sm font-semibold tracking-wide text-white">
                Save Changes
              </button>
            </div>
          </section>
        </div>

        <section className="surface-card rounded-[1.6rem] p-4">
          <div className="flex flex-col gap-1">
            <p className="section-label text-accent-red">Danger Zone</p>
            <p className="text-sm font-semibold text-text-primary">Delete Workout</p>
            <p className="text-sm leading-relaxed text-text-muted">
              Permanently removes this logged workout from history.
            </p>
          </div>

          {showDeleteConfirm ? (
            <div className="mt-4 flex flex-col gap-3 rounded-[1.3rem] border border-accent-red/15 bg-accent-red/8 p-4">
              <p className="text-sm text-text-secondary">Delete this workout permanently?</p>
              <div className="grid grid-cols-2 gap-2.5">
                <button onClick={handleDelete} className="btn-primary py-3 text-sm font-semibold text-white">
                  Delete
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost py-3 text-sm font-medium">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-ghost mt-4 w-full py-3 text-sm font-semibold text-accent-red"
            >
              Delete Workout
            </button>
          )}
        </section>
      </PageLayout>
    </>
  );
}
