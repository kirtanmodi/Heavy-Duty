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
  const [showReorderControls, setShowReorderControls] = useState(false);

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
        <section className="flex flex-col items-center gap-3 px-6 pt-20 text-center">
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
            <path d="M16.5 16.5L21 21" />
          </svg>
          <p className="section-title">Workout not found</p>
        </section>
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

      <PageLayout withBottomNavPadding={false} className="flex flex-col gap-6 overflow-x-clip!">
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate("/history")}
              className="btn-icon"
              aria-label="Cancel and return to history"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={() => setShowReorderControls((prev) => !prev)}
              aria-pressed={showReorderControls}
              className={`chip min-h-11 shrink-0 gap-1.5 px-3.5 text-[14px] font-medium ${
                showReorderControls ? "bg-fill-strong text-text-primary" : "text-text-secondary active:bg-fill-strong"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              >
                <path d="M8 4v16M4 8l4-4 4 4M16 20V4M20 16l-4 4-4-4" />
              </svg>
              {showReorderControls ? "Done reordering" : "Reorder"}
            </button>
          </div>

          <div className="min-w-0 px-1">
            <h1 className="page-title">
              {workout.day.includes(" — ") ? workout.day.split(" — ")[1] : workout.day}
            </h1>
            <p className="mt-1 text-[13px] tabular-nums text-text-muted">
              {formatRelativeDate(workout.date)}
              <span className="text-text-dim"> · </span>
              {workoutTypeLabel}
              <span className="text-text-dim"> · </span>
              {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
              <span className="text-text-dim"> · </span>
              {totalSetCount} set{totalSetCount !== 1 ? "s" : ""}
            </p>
          </div>
        </header>

        {exercises.length === 0 ? (
          <section className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-text-muted"
              aria-hidden="true"
            >
              <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
            </svg>
            <div className="flex max-w-[18rem] flex-col gap-1">
              <p className="section-title">No exercises in this workout</p>
              <p className="text-[15px] leading-relaxed text-text-muted">
                Add an exercise if you want this logged session to include set details.
              </p>
            </div>
          </section>
        ) : (
          <div className="flex flex-col gap-4">
            {exercises.map((entry, exIndex) => {
              const isFirst = exIndex === 0;
              const isLast = exIndex === exercises.length - 1;

              return (
                <section key={`s-${exIndex}`} className="flex flex-col gap-2.5">
                  {showReorderControls && (
                    <div className="flex items-center justify-between gap-3 pl-1">
                      <span className="section-label tabular-nums">Exercise {exIndex + 1}</span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleMoveGroup(exIndex, "up")}
                          className={`btn-icon ${isFirst ? "pointer-events-none opacity-30" : ""}`}
                          aria-label="Move up"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-[18px] w-[18px]"
                            aria-hidden="true"
                          >
                            <path d="M18 15l-6-6-6 6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveGroup(exIndex, "down")}
                          className={`btn-icon ${isLast ? "pointer-events-none opacity-30" : ""}`}
                          aria-label="Move down"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-[18px] w-[18px]"
                            aria-hidden="true"
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

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

        <div className="flex flex-col gap-3">
          <button onClick={() => setShowAddExercise(true)} className="btn-secondary w-full text-[15px]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="h-[18px] w-[18px]"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add exercise
          </button>

          {showDeleteConfirm ? (
            <div className="flex flex-col gap-3 pt-1">
              <p className="text-center text-[15px] font-semibold text-text-primary">Delete this workout permanently?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleDelete} className="btn-danger text-[15px]">
                  Delete
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary text-[15px]">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-tertiary w-full text-[15px] text-accent-red"
            >
              Delete workout
            </button>
          )}
        </div>

        <div className="sticky z-10 mt-auto" style={{ bottom: "max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}>
          <div className="glass flex flex-col gap-1 rounded-[1.25rem] bg-bg-elevated/95 p-2">
            <button onClick={handleSave} className="btn-primary w-full text-[15px]">
              Save changes
            </button>
            <p className="px-3 pb-1 text-center text-[12px] leading-snug text-text-muted">
              Exercises without reps are removed when you save.
            </p>
          </div>
        </div>
      </PageLayout>
    </>
  );
}
