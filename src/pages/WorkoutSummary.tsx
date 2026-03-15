import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { prefetchRoute } from "../lib/routePrefetch";
import { calcProgress, calcStats, findPrevSession } from "../lib/stats";
import { useWorkoutStore } from "../store/workoutStore";

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
    <PageLayout withBottomNavPadding={false} className="flex flex-col gap-5">
      <section className="surface-card rounded-[1.9rem] p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-green/15">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
            <path d="M8 12l3 3 5-5" stroke="var(--color-accent-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="section-label mt-4 text-accent-green">Workout Saved</p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl tracking-wide text-text-primary">{lastWorkout.day}</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Saved to your history{duration ? ` · ${duration}` : ""}. You can head home now or open history if you want the full session breakdown.
        </p>
      </section>

      <section className="surface-card rounded-[1.6rem] p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-[1.2rem] border border-white/[0.06] bg-white/[0.03] px-3 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">Exercises</p>
            <p className="mt-2 font-[var(--font-display)] text-3xl tabular-nums text-text-primary">{stats.totalExercises}</p>
          </div>
          <div className="rounded-[1.2rem] border border-white/[0.06] bg-white/[0.03] px-3 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">Sets</p>
            <p className="mt-2 font-[var(--font-display)] text-3xl tabular-nums text-text-primary">{stats.totalSets}</p>
          </div>
          <div className="rounded-[1.2rem] border border-white/[0.06] bg-white/[0.03] px-3 py-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">Volume</p>
            <p className="mt-2 font-[var(--font-display)] text-3xl tabular-nums text-text-primary">{stats.totalVolume.toLocaleString()}</p>
            <p className="text-[11px] font-medium text-text-dim">kg</p>
          </div>
        </div>
      </section>

      {progress && (
        <section className="surface-card-muted rounded-[1.6rem] p-4">
          <p className="section-label">Compared With Last Time</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm leading-relaxed text-text-secondary">
              {progress.type === "increase" && "You lifted more total volume than the last matching session."}
              {progress.type === "decrease" && "This session came in below the last matching session."}
              {progress.type === "same" && "This session matched the last matching session."}
            </p>
            <span
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold tabular-nums ${
                progress.type === "increase"
                  ? "bg-accent-green/12 text-accent-green"
                  : progress.type === "decrease"
                    ? "bg-accent-red/12 text-accent-red"
                    : "bg-white/[0.06] text-text-secondary"
              }`}
            >
              {progress.type === "increase" && "↑ "}
              {progress.type === "decrease" && "↓ "}
              {progress.type === "same" && "→ "}
              {Math.abs(progress.volumePercent).toFixed(0)}%
            </span>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-2.5">
        <button
          onClick={() => navigate("/")}
          onMouseEnter={() => prefetchRoute("/")}
          onFocus={() => prefetchRoute("/")}
          onTouchStart={() => prefetchRoute("/")}
          className="w-full rounded-[14px] btn-primary py-4 text-sm font-semibold tracking-wide text-white"
        >
          Back Home
        </button>
        <button
          onClick={() => navigate("/history")}
          onMouseEnter={() => prefetchRoute("/history")}
          onFocus={() => prefetchRoute("/history")}
          onTouchStart={() => prefetchRoute("/history")}
          className="w-full rounded-[14px] border border-white/[0.08] bg-transparent py-3.5 text-sm font-medium text-text-secondary transition-colors active:bg-white/[0.04]"
        >
          View in History
        </button>
      </div>

      <div className="h-4" />
    </PageLayout>
  );
}
