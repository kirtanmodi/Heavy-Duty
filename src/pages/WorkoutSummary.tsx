import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getRandomQuote } from "../data/quotes";
import { calcProgress, calcStats, findPrevSession } from "../lib/stats";
import { useWorkoutStore } from "../store/workoutStore";

export function WorkoutSummary() {
  const navigate = useNavigate();
  const lastWorkout = useWorkoutStore((s) => s.lastCompletedWorkout);
  const history = useWorkoutStore((s) => s.history);

  if (!lastWorkout) {
    navigate("/");
    return null;
  }

  const stats = calcStats(lastWorkout);
  const prev = findPrevSession(lastWorkout, history);
  const progress = calcProgress(lastWorkout, prev);

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
    <PageLayout withBottomNavPadding={false} className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 pt-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-green/15">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
            <path d="M8 12l3 3 5-5" stroke="var(--color-accent-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="font-[var(--font-display)] text-4xl tracking-wide text-text-primary">Workout Complete</h1>
        <p className="text-sm text-accent-green font-medium">Saved to your history</p>
        <p className="max-w-[300px] text-sm leading-relaxed text-text-secondary italic">
          "{getRandomQuote()}"
        </p>
      </div>

      {/* Stats Grid */}
      <div className="card-glow-green rounded-[14px] bg-bg-card p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          {duration && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-medium tracking-wider text-text-muted uppercase">Duration</span>
              <span className="font-[var(--font-display)] text-2xl tabular-nums text-text-primary">{duration}</span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-wider text-text-muted uppercase">Exercises</span>
            <span className="font-[var(--font-display)] text-2xl tabular-nums text-text-primary">{stats.totalExercises}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-wider text-text-muted uppercase">Sets</span>
            <span className="font-[var(--font-display)] text-2xl tabular-nums text-text-primary">{stats.totalSets}</span>
          </div>
        </div>

        {/* Volume + comparison */}
        <div className="mt-4 flex items-center justify-center gap-3 border-t border-border pt-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium tracking-wider text-text-muted uppercase">Total Volume</span>
            <span className="font-[var(--font-display)] text-3xl tabular-nums text-text-primary">
              {stats.totalVolume.toLocaleString()}
              <span className="text-lg text-text-muted">kg</span>
            </span>
          </div>
          {progress && (
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums ${
                progress.type === "increase"
                  ? "bg-accent-green/12 text-accent-green"
                  : progress.type === "decrease"
                    ? "bg-accent-red/12 text-accent-red"
                    : "bg-bg-input text-text-muted"
              }`}
            >
              {progress.type === "increase" && "↑ "}
              {progress.type === "decrease" && "↓ "}
              {progress.type === "same" && "→ "}
              {Math.abs(progress.volumePercent).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Exercise Summary */}
      <div className="flex flex-col gap-2 rounded-[14px] bg-bg-card card-surface p-5">
        <h3 className="mb-1 text-xs font-semibold tracking-widest text-text-muted uppercase">Exercise Summary</h3>
        {lastWorkout.exercises.map((entry) => (
          <div key={entry.id} className={`flex items-center justify-between rounded-lg bg-bg-input px-3 py-2.5 ${entry.skipped ? "opacity-50" : ""}`}>
            <span className={`text-sm font-medium ${entry.skipped ? "text-text-muted line-through" : "text-text-primary"}`}>{entry.name}</span>
            {entry.skipped ? (
              <span className="text-[10px] font-semibold tracking-wider text-accent-yellow uppercase">Skipped</span>
            ) : (
              <span className="text-xs tabular-nums text-text-secondary">
                {entry.sets.length} × {entry.sets[0]?.weight > 0 ? `${entry.sets[0].weight}kg` : "BW"}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-2.5">
        <button
          onClick={() => navigate("/")}
          className="w-full rounded-[14px] btn-primary py-4 text-sm font-semibold tracking-wide text-white"
        >
          Done
        </button>
        <button
          onClick={() => navigate("/history")}
          className="w-full rounded-[14px] border border-white/[0.08] bg-transparent py-3.5 text-sm font-medium text-text-secondary transition-colors active:bg-white/[0.04]"
        >
          View in History
        </button>
      </div>

      <div className="h-4" />
    </PageLayout>
  );
}
