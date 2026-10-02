import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { formatDayDate } from "../lib/dates";
import { prefetchRoute } from "../lib/routePrefetch";
import { calcProgress, calcStats, findPrevSession } from "../lib/stats";
import { useWorkoutStore } from "../store/workoutStore";
import type { ExerciseEntry } from "../types";

function describeExercise(exercise: ExerciseEntry): string {
  if (exercise.skipped) return "Skipped";
  if (exercise.sets.length === 0) return "No sets logged";
  const best = exercise.sets.reduce(
    (top, s) => (s.weight * s.reps > top.weight * top.reps ? s : top),
    exercise.sets[0],
  );
  const setLabel = `${exercise.sets.length} set${exercise.sets.length !== 1 ? "s" : ""}`;
  return `${setLabel} · best ${best.weight > 0 ? `${best.weight}kg` : "BW"} × ${best.reps}`;
}

export function WorkoutSummary() {
  const navigate = useNavigate();
  const lastWorkout = useWorkoutStore((s) => s.lastCompletedWorkout);
  const history = useWorkoutStore((s) => s.history);

  useEffect(() => {
    if (!lastWorkout) navigate("/", { replace: true });
  }, [lastWorkout, navigate]);

  useEffect(() => {
    if (!lastWorkout) return;
    prefetchRoute("/");
    prefetchRoute("/history");
  }, [lastWorkout]);

  if (!lastWorkout) return null;

  const stats = calcStats(lastWorkout);
  const prev = findPrevSession(lastWorkout, history);
  const progress = calcProgress(lastWorkout, prev);

  // Compute duration
  const duration = (() => {
    if (!lastWorkout.startedAt) return null;
    const start = new Date(lastWorkout.startedAt).getTime();
    const end = new Date(lastWorkout.date).getTime();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    return `${m} min`;
  })();

  return (
    <PageLayout withBottomNavPadding={false} className="flex flex-col gap-6 overflow-x-clip!">
      <header className="flex flex-col items-center px-2 pt-8 text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 text-accent-green"
          aria-hidden="true"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        <h1 className="page-title mt-4">Workout complete</h1>
        <p className="mt-2 text-[15px] leading-snug text-text-secondary">
          {lastWorkout.day.includes(" — ") ? lastWorkout.day.split(" — ")[1] : lastWorkout.day}
        </p>
        <p className="mt-1 text-[13px] tabular-nums text-text-muted">
          Saved to history · {formatDayDate(lastWorkout.date)}
          {duration ? ` · ${duration}` : ""}
        </p>
      </header>

      <section className="surface-card overflow-hidden rounded-[1.25rem]">
        <div className="grid grid-cols-3 divide-x divide-separator py-4 text-center">
          <div className="flex flex-col items-center gap-1.5 px-2">
            <p className="stat-value text-[24px] text-text-primary">{stats.totalExercises}</p>
            <p className="text-[12px] text-text-muted">Exercises</p>
          </div>
          <div className="flex flex-col items-center gap-1.5 px-2">
            <p className="stat-value text-[24px] text-text-primary">{stats.totalSets}</p>
            <p className="text-[12px] text-text-muted">Sets</p>
          </div>
          <div className="flex min-w-0 flex-col items-center gap-1.5 px-2">
            <p className="stat-value max-w-full truncate text-[24px] text-text-primary">
              {stats.totalVolume.toLocaleString()}
              <span className="ml-0.5 text-[13px] font-medium tracking-normal text-text-muted">kg</span>
            </p>
            <p className="text-[12px] text-text-muted">Volume</p>
          </div>
        </div>

        {progress && (
          <div className="flex items-center gap-3 border-t border-separator px-4 py-3">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-text-secondary">
              {progress.type === "same" ? "Volume matched last session" : "Volume vs. last session"}
            </p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium leading-tight tabular-nums ${
                progress.type === "increase"
                  ? "bg-accent-green/12 text-accent-green"
                  : progress.type === "decrease"
                    ? "bg-accent-orange/12 text-accent-orange"
                    : "bg-fill text-text-secondary"
              }`}
            >
              {progress.type === "increase" && "↑ "}
              {progress.type === "decrease" && "↓ "}
              {progress.type === "same" && "→ "}
              {Math.abs(progress.volumePercent).toFixed(0)}%
            </span>
          </div>
        )}
      </section>

      {lastWorkout.exercises.length > 0 && (
        <section className="list-group">
          {lastWorkout.exercises.map((exercise, index) => (
            <div key={`${exercise.id}-${index}`} className="flex min-h-[3.25rem] flex-col justify-center px-4 py-3">
              <p
                className={`truncate text-[15px] font-medium ${
                  exercise.skipped ? "text-text-muted line-through" : "text-text-primary"
                }`}
              >
                {exercise.name}
              </p>
              <p className="mt-0.5 text-[13px] tabular-nums text-text-muted">{describeExercise(exercise)}</p>
            </div>
          ))}
        </section>
      )}

      <div className="sticky z-10 mt-auto" style={{ bottom: "max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}>
        <div className="glass flex flex-col gap-1 rounded-[1.25rem] bg-bg-elevated/95 p-2">
          <button
            onClick={() => navigate("/")}
            onMouseEnter={() => prefetchRoute("/")}
            onFocus={() => prefetchRoute("/")}
            onTouchStart={() => prefetchRoute("/")}
            className="btn-primary w-full text-[15px]"
          >
            Done
          </button>
          <button
            onClick={() => navigate("/history")}
            onMouseEnter={() => prefetchRoute("/history")}
            onFocus={() => prefetchRoute("/history")}
            onTouchStart={() => prefetchRoute("/history")}
            className="btn-tertiary w-full text-[15px]"
          >
            View history
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
