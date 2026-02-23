import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getProgram } from "../data/programs";
import { getRandomQuote } from "../data/quotes";
import { calcStats } from "../lib/stats";
import { useWorkoutStore } from "../store/workoutStore";
import type { ProgramDay } from "../types";

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function daysSinceLastSession(dayId: string, history: { dayId: string; date: string }[]): number | null {
  for (const w of history) {
    if (w.dayId === dayId) {
      const now = new Date();
      const then = new Date(w.date);
      return Math.round((now.getTime() - then.getTime()) / 86400000);
    }
  }
  return null;
}


const CARDIO_ICONS: Record<string, React.ReactNode> = {
  cardio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  recovery: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9" strokeLinecap="round" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

function LastDoneLabel({ day, history }: { day: ProgramDay; history: { dayId: string; date: string }[] }) {
  const daysSince = daysSinceLastSession(day.id, history);
  if (daysSince === null) return <span className="text-xs text-text-dim">Never done</span>;
  if (daysSince === 0) return <span className="text-xs text-accent-green">Done today</span>;
  return (
    <span className={`text-xs ${daysSince >= 4 ? "text-accent-orange" : "text-text-muted"}`}>
      {formatRelativeDate(history.find((w) => w.dayId === day.id)!.date)}
    </span>
  );
}

function formatElapsed(isoStart: string): string {
  const start = new Date(isoStart).getTime();
  const now = Date.now();
  const mins = Math.floor((now - start) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Home() {
  const navigate = useNavigate();
  const history = useWorkoutStore((s) => s.history);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const program = getProgram("heavy-duty-complete")!;
  const [cardioExpanded, setCardioExpanded] = useState(false);

  const liftDays = useMemo(() => program.days.filter((d) => d.type === "lift"), [program.days]);
  const cardioDays = useMemo(
    () => program.days.filter((d) => d.type === "cardio" || d.type === "recovery"),
    [program.days],
  );

  // Smart suggest: rank lifting workouts by staleness (most overdue first)
  const rankedLifts = useMemo(() => {
    const scored = liftDays.map((day) => {
      const daysSince = daysSinceLastSession(day.id, history);
      return { day, daysSince, sortKey: daysSince === null ? Infinity : daysSince };
    });
    scored.sort((a, b) => b.sortKey - a.sortKey);
    return scored;
  }, [liftDays, history]);

  const suggested = rankedLifts[0];
  const otherLifts = rankedLifts.slice(1);

  const quote = useMemo(() => getRandomQuote(), []);

  const streak = useMemo(() => {
    if (history.length === 0) return 0;
    let count = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const check = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStr = check.toISOString().slice(0, 10);
      const hasWorkout = history.some((w) => w.date.slice(0, 10) === dayStr);
      if (hasWorkout) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  }, [history]);

  const weeklyVolume = useMemo(() => {
    const monday = getMonday(new Date());
    const mondayTime = monday.getTime();
    let total = 0;
    for (const w of history) {
      if (new Date(w.date).getTime() >= mondayTime) {
        total += calcStats(w).totalVolume;
      }
    }
    return total;
  }, [history]);

  const lastSession = history.length > 0 ? history[0] : null;

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <PageLayout className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-end justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <span className="font-[var(--font-display)] text-[2.5rem] leading-none tracking-wider text-accent-red">H</span>
          <h1 className="font-[var(--font-display)] text-[1.6rem] leading-none tracking-widest text-text-primary">HEAVY DUTY</h1>
        </div>
        <span className="pb-0.5 text-xs text-text-muted">{dateStr}</span>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-3">

        {/* Resume banner */}
        {activeWorkout && (
          <button
            onClick={() => navigate(`/workout/${activeWorkout.dayId}`)}
            className="col-span-2 flex items-center gap-4 rounded-[14px] border-l-[3px] border-accent-green bg-bg-card p-4 text-left animate-fade-up"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-green/10">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-accent-green">
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[10px] font-semibold tracking-widest text-accent-green uppercase">
                In Progress
              </span>
              <h3 className="font-[var(--font-display)] text-xl tracking-wide text-text-primary">
                {activeWorkout.dayName}
              </h3>
              <span className="text-xs text-text-muted">
                {activeWorkout.exercises.filter(e => !e.skipped).length} exercises · Started {formatElapsed(activeWorkout.startedAt)}
              </span>
            </div>
            <span className="text-sm font-semibold text-accent-green">Resume →</span>
          </button>
        )}

        {/* Hero — Suggested Next Workout */}
        {suggested && (
          <button
            onClick={() => navigate(`/workout/${suggested.day.id}`)}
            className="col-span-2 flex flex-col gap-3 rounded-[14px] border-l-[3px] border-accent-red bg-bg-card p-5 text-left card-glow-red animate-fade-up"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-widest text-accent-red uppercase">Up Next</span>
              {suggested.daysSince !== null && suggested.daysSince >= 3 && (
                <>
                  <span className="text-[10px] text-text-dim">·</span>
                  <span className="text-[10px] font-medium tracking-wider text-accent-orange uppercase">
                    {suggested.daysSince}d overdue
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-[var(--font-display)] text-3xl tracking-wide text-text-primary">
                {suggested.day.focus}
              </h2>
              <p className="text-sm text-text-secondary">
                {suggested.day.exercises.length} exercises · Pre-exhaust supersets
              </p>
              <LastDoneLabel day={suggested.day} history={history} />
            </div>
            <div className="flex items-center gap-2 self-start rounded-[10px] btn-primary px-5 py-2.5 text-sm font-semibold text-white">
              Start Workout
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        {/* Other 2 lifting workouts */}
        {otherLifts.map(({ day, daysSince }, i) => (
          <button
            key={day.id}
            onClick={() => navigate(`/workout/${day.id}`)}
            className="flex flex-col gap-2.5 rounded-[14px] bg-bg-card p-4 text-left card-surface animate-fade-up"
            style={{ animationDelay: `${(i + 1) * 50}ms` }}
          >
            <h3 className="font-[var(--font-display)] text-xl tracking-wide text-text-primary">{day.focus}</h3>
            <p className="text-xs text-text-secondary">{day.exercises.length} exercises</p>
            <LastDoneLabel day={day} history={history} />
            {daysSince !== null && daysSince === 0 ? (
              <span className="mt-auto flex items-center gap-1 text-[10px] font-semibold text-accent-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Completed
              </span>
            ) : (
              <span className="mt-auto text-[10px] font-medium tracking-wider text-text-dim uppercase">
                Start →
              </span>
            )}
          </button>
        ))}

        {/* Open Workout */}
        <button
          onClick={() => navigate("/workout/open")}
          className="col-span-2 flex items-center gap-4 rounded-[14px] border border-dashed border-accent-yellow/25 bg-bg-card/50 p-4 text-left transition-colors active:bg-bg-card animate-fade-up"
          style={{ animationDelay: `${(otherLifts.length + 1) * 50}ms` }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-yellow/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-accent-yellow">
              <path d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-[var(--font-display)] text-xl tracking-wide text-text-primary">Open Workout</h3>
            <p className="text-xs text-text-muted">Build your own — pick any exercises</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto h-4 w-4 shrink-0 text-text-dim">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>

        {/* Cardio & Recovery — expandable full-width */}
        <div className="col-span-2 overflow-hidden rounded-[14px] bg-bg-card card-surface animate-fade-up" style={{ animationDelay: "150ms" }}>
          <button
            onClick={() => setCardioExpanded((v) => !v)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-green/10 text-accent-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text-primary">Cardio & Recovery</span>
                <span className="text-[10px] text-text-muted">{cardioDays.length} options</span>
              </div>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`h-4 w-4 text-text-dim transition-transform duration-200 ${cardioExpanded ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {cardioExpanded && (
            <div className="flex flex-col border-t border-border">
              {cardioDays.map((day) => (
                <button
                  key={day.id}
                  onClick={() => navigate(`/workout/${day.id}`)}
                  className="flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-bg-card-hover"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-input text-text-muted">
                    {CARDIO_ICONS[day.type] ?? CARDIO_ICONS.cardio}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium text-text-primary">{day.focus}</span>
                    {day.duration && <span className="text-[10px] text-text-muted">{day.duration}</span>}
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-text-dim">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Streak */}
        <div className="flex flex-col gap-2 rounded-[14px] bg-bg-card p-4 card-surface animate-fade-up" style={{ animationDelay: "200ms" }}>
          <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">Streak</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-[var(--font-display)] text-4xl tabular-nums text-accent-orange">{streak}</span>
            <span className="text-sm text-text-muted">{streak === 1 ? "day" : "days"}</span>
          </div>
        </div>

        {/* Total Workouts */}
        <div className="flex flex-col gap-2 rounded-[14px] bg-bg-card p-4 card-surface animate-fade-up" style={{ animationDelay: "250ms" }}>
          <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">Workouts</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-[var(--font-display)] text-4xl tabular-nums text-accent-blue">{history.length}</span>
            <span className="text-sm text-text-muted">total</span>
          </div>
        </div>

        {/* Last Session */}
        <div className="flex flex-col gap-2 rounded-[14px] bg-bg-card p-4 card-surface animate-fade-up" style={{ animationDelay: "300ms" }}>
          <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">Last Session</span>
          {lastSession ? (
            <div className="flex flex-col gap-0.5">
              <span className="font-[var(--font-display)] text-xl tracking-wide text-text-primary">
                {lastSession.day.split("—")[0].trim().split(" ").pop()}
              </span>
              <span className="text-xs text-text-muted">{formatRelativeDate(lastSession.date)}</span>
            </div>
          ) : (
            <span className="text-sm text-text-dim">No sessions yet</span>
          )}
        </div>

        {/* Weekly Volume */}
        <div className="flex flex-col gap-2 rounded-[14px] bg-bg-card p-4 card-surface animate-fade-up" style={{ animationDelay: "350ms" }}>
          <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">This Week</span>
          <div className="flex flex-col gap-0.5">
            <span className="font-[var(--font-display)] text-xl tabular-nums text-text-primary">
              {weeklyVolume > 0 ? weeklyVolume.toLocaleString() : "—"}
            </span>
            {weeklyVolume > 0 && <span className="text-xs text-text-muted">kg volume</span>}
          </div>
        </div>

        {/* Mentzer Quote — full width */}
        <div className="col-span-2 rounded-[14px] border border-border-card bg-bg-card/50 p-5 animate-fade-up" style={{ animationDelay: "400ms" }}>
          <p className="text-sm leading-relaxed text-text-secondary italic">"{quote}"</p>
          <p className="mt-2 text-[10px] font-medium tracking-wider text-text-dim uppercase">— Mike Mentzer</p>
        </div>
      </div>
    </PageLayout>
  );
}
