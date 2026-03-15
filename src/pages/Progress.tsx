import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageLayout } from "../components/layout/PageLayout";
import { Schedule } from "../components/Schedule";
import {
  getTrackedExercises,
  getExerciseSessions,
  getExercisePRs,
} from "../lib/charts";
import {
  muscleColors,
  getEffectiveExercise,
  exerciseGroups,
} from "../data/exercises";
import { useWorkoutStore } from "../store/workoutStore";
import type { PRRecord } from "../lib/charts";
import type { MuscleGroup } from "../types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPRDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMetricValue(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k kg` : `${value}kg`;
}

function humanizeLabel(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const tooltipStyle = {
  background: "rgba(15, 18, 27, 0.96)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "16px",
  fontSize: "12px",
  color: "white",
  boxShadow: "0 14px 28px rgba(0,0,0,0.28)",
};

const prIcons: Record<string, string> = {
  weight: "W",
  "1rm": "1",
  volume: "V",
};

const muscleToGroup = new Map<string, string>();
for (const g of exerciseGroups) {
  for (const m of g.muscles) {
    muscleToGroup.set(m, g.label);
  }
}

function getExerciseGroupLabel(exerciseId: string): string {
  const ex = getEffectiveExercise(exerciseId);
  if (!ex) return "Other";
  for (const m of ex.primaryMuscles) {
    const label = muscleToGroup.get(m);
    if (label) return label;
  }
  return "Other";
}

const groupColors: Record<string, string> = {
  Chest: "#FF4444",
  Back: "#4488FF",
  Shoulders: "#FFAA00",
  Arms: "#44DD44",
  Traps: "#88CCFF",
  Legs: "#FF8844",
  Abs: "#CCCC44",
};

function SectionHeading({
  eyebrow,
  title,
  description,
  trailing,
}: {
  eyebrow: string;
  title: string;
  description: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="section-label">{eyebrow}</p>
        <h2 className="mt-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-text-primary">
          {title}
        </h2>
        <p className="section-caption mt-1 max-w-[24rem]">{description}</p>
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
  fullWidth = false,
  compact = false,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
  compact?: boolean;
}) {
  const sizeClass = compact ? "px-3.5 py-2 text-[11px]" : "px-4 py-2.5 text-sm";

  return (
    <div
      className={`segmented-surface inline-flex ${fullWidth ? "w-full" : ""} gap-1 rounded-full p-1`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`${fullWidth ? "flex-1" : ""} touch-target rounded-full font-semibold transition-all ${sizeClass} ${active ? "segmented-active" : "text-text-muted"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="surface-card-muted rounded-[1.2rem] p-3">
      <p className="text-[11px] font-medium text-text-dim">{label}</p>
      <p
        className="mt-2 text-[1rem] font-semibold tabular-nums text-text-primary"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-text-dim">{hint}</p> : null}
    </div>
  );
}

function EmptyStateCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="surface-card flex flex-col gap-4 rounded-[1.75rem] p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-text-secondary">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-5 w-5"
        >
          <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 16l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="section-label">{eyebrow}</p>
        <h2 className="mt-2 text-lg font-semibold text-text-primary">{title}</h2>
        <p className="section-caption mt-1.5">{description}</p>
      </div>
    </div>
  );
}

function PRBadge({ pr, color }: { pr: PRRecord; color: string }) {
  const labels = {
    weight: "Best Weight",
    "1rm": "Est. 1RM",
    volume: "Best Volume",
  };
  const units = {
    weight: `${pr.value}kg${pr.reps ? ` × ${pr.reps}` : ""}`,
    "1rm": `${pr.value}kg`,
    volume: formatMetricValue(pr.value),
  };

  return (
    <div className="surface-card-muted relative overflow-hidden rounded-[1.35rem] p-3.5">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `${color}99` }}
      />
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[11px] font-bold"
          style={{ background: `${color}22`, color }}
        >
          {prIcons[pr.type]}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-dim">
            {labels[pr.type]}
          </p>
          <p
            className="mt-2 text-[1rem] font-semibold tabular-nums"
            style={{ color }}
          >
            {units[pr.type]}
          </p>
          <p className="mt-1 text-[11px] text-text-dim">{formatPRDate(pr.date)}</p>
        </div>
      </div>
    </div>
  );
}

function ExerciseChip({
  active,
  color,
  name,
  sessionCount,
  onClick,
}: {
  active: boolean;
  color: string;
  name: string;
  sessionCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`touch-target rounded-full border px-3 py-2 text-left transition-all ${
        active
          ? "text-text-primary"
          : "border-white/[0.08] bg-white/[0.03] text-text-secondary"
      }`}
      style={
        active
          ? {
              background: `linear-gradient(135deg, ${color}22 0%, ${color}38 100%)`,
              borderColor: `${color}66`,
              boxShadow: `0 12px 22px ${color}22`,
            }
          : undefined
      }
    >
      <span className="text-[13px] font-medium">{name}</span>
      <span className={`ml-2 text-[10px] font-semibold ${active ? "text-white/70" : "text-text-dim"}`}>
        {sessionCount}x
      </span>
    </button>
  );
}

export function Progress() {
  const history = useWorkoutStore((s) => s.history);
  const location = useLocation();
  const [view, setView] = useState<"charts" | "schedule">(
    (location.state as { tab?: string } | null)?.tab === "schedule" ? "schedule" : "charts"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("All");
  const [chartMode, setChartMode] = useState<"1rm" | "volume">("1rm");
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const tracked = useMemo(() => getTrackedExercises(history), [history]);

  // Group exercises by muscle category
  const groupedExercises = useMemo(() => {
    const groups = new Map<
      string,
      { id: string; name: string; sessionCount: number }[]
    >();
    for (const ex of tracked) {
      const group = getExerciseGroupLabel(ex.id);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(ex);
    }
    // Sort groups by exerciseGroups order
    const ordered: {
      label: string;
      exercises: { id: string; name: string; sessionCount: number }[];
    }[] = [];
    for (const g of exerciseGroups) {
      const exs = groups.get(g.label);
      if (exs && exs.length > 0) ordered.push({ label: g.label, exercises: exs });
    }
    const other = groups.get("Other");
    if (other && other.length > 0)
      ordered.push({ label: "Other", exercises: other });
    return ordered;
  }, [tracked]);

  const visibleExercises = useMemo(() => {
    if (selectedGroup === "All") return tracked;
    const group = groupedExercises.find((g) => g.label === selectedGroup);
    return group?.exercises ?? [];
  }, [selectedGroup, tracked, groupedExercises]);

  const activeId =
    selectedId &&
    visibleExercises.some((ex) => ex.id === selectedId)
      ? selectedId
      : visibleExercises[0]?.id ?? null;

  const activeTrackedExercise = activeId
    ? tracked.find((trackedExercise) => trackedExercise.id === activeId) ?? null
    : null;

  const sessions = useMemo(
    () => (activeId ? getExerciseSessions(activeId, history) : []),
    [activeId, history],
  );

  const prs = useMemo(
    () => (activeId ? getExercisePRs(activeId, history) : []),
    [activeId, history],
  );

  const exercise = activeId ? getEffectiveExercise(activeId) : null;
  const activeGroup =
    activeId ? getExerciseGroupLabel(activeId) : selectedGroup === "All" ? "Other" : selectedGroup;
  const color = exercise
    ? muscleColors[exercise.primaryMuscles[0] as MuscleGroup] ||
      groupColors[activeGroup] ||
      "#8F93A2"
    : groupColors[activeGroup] || "#8F93A2";

  const chartData = sessions.map((s) => ({
    date: formatDate(s.date),
    value: chartMode === "1rm" ? s.estimated1RM : s.totalVolume,
    weight: s.bestWeight,
    reps: s.bestReps,
  }));

  const latestSession = sessions[sessions.length - 1] ?? null;
  const bestWeightPR = prs.find((pr) => pr.type === "weight");
  const exerciseTitle = exercise?.name ?? activeTrackedExercise?.name ?? "Exercise";
  const exerciseMeta = exercise
    ? `${exercise.primaryMuscles.map(humanizeLabel).join(", ")} · ${humanizeLabel(exercise.equipment)} · ${humanizeLabel(exercise.type)}`
    : "Saved from workout history";
  const displayedSessions = useMemo(
    () => (showAllSessions ? sessions.slice().reverse() : sessions.slice().reverse().slice(0, 3)),
    [sessions, showAllSessions],
  );
  const prGridStyle: CSSProperties = {
    gridTemplateColumns: `repeat(${Math.max(1, Math.min(prs.length, 3))}, minmax(0, 1fr))`,
  };

  return (
    <PageLayout className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 pt-1">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-[var(--font-display)] text-[2rem] tracking-wider text-text-primary">
              Progress
            </h1>
            <p className="mt-1 max-w-[22rem] text-sm leading-6 text-text-secondary">
              Review charts, personal bests, and your weekly plan in one place.
            </p>
          </div>
          <span className="chip chip-muted shrink-0 text-[11px] font-medium text-text-secondary">
            {tracked.length} tracked
          </span>
        </div>

        <SegmentedControl
          options={[
            { value: "charts", label: "Charts" },
            { value: "schedule", label: "Schedule" },
          ]}
          value={view}
          onChange={(next) => setView(next as "charts" | "schedule")}
          fullWidth
        />
      </header>

      {view === "schedule" ? (
        <Schedule />
      ) : tracked.length === 0 ? (
        <EmptyStateCard
          eyebrow="Charts"
          title="No progress yet"
          description="Log a few workouts to unlock charts and PRs. The Schedule tab is ready whenever you want to preview the week."
        />
      ) : (
        <>
          <section className="hero-surface rounded-[1.9rem] p-5 animate-fade-up">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="section-label text-white/60">Selected Exercise</p>
                <h2
                  className="mt-2 font-[var(--font-display)] text-[2rem] leading-none tracking-[0.08em]"
                  style={{ color }}
                >
                  {exerciseTitle}
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{exerciseMeta}</p>
              </div>
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.35rem] border border-white/[0.08] bg-white/[0.05]"
                style={{ boxShadow: `0 0 0 1px ${color}22 inset` }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                  style={{ color }}
                >
                  <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 16l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {exercise ? (
                <>
                  {exercise.primaryMuscles.slice(0, 2).map((muscle) => (
                    <span
                      key={muscle}
                      className="chip chip-muted text-[11px] text-text-secondary"
                    >
                      {humanizeLabel(muscle)}
                    </span>
                  ))}
                  <span className="chip chip-muted text-[11px] text-text-secondary">
                    {humanizeLabel(exercise.equipment)}
                  </span>
                  <span className="chip chip-muted text-[11px] text-text-secondary">
                    {humanizeLabel(exercise.type)}
                  </span>
                </>
              ) : (
                <span className="chip chip-muted text-[11px] text-text-secondary">
                  Workout history
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatCard label="Sessions" value={`${sessions.length}`} hint="Logged" />
              <StatCard
                label="Latest"
                value={latestSession ? formatDate(latestSession.date) : "—"}
                hint="Most recent"
              />
              <StatCard
                label="Best Weight"
                value={bestWeightPR ? `${bestWeightPR.value}kg` : "—"}
                hint={bestWeightPR?.reps ? `${bestWeightPR.reps} reps` : "All-time"}
                accent={color}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3 animate-fade-up">
            <SectionHeading
              eyebrow="Exercise"
              title="Change tracked exercise"
              description="Open the picker only when you want to switch context."
              trailing={
                <button
                  type="button"
                  onClick={() => setShowExercisePicker((value) => !value)}
                  className="btn-ghost px-3 py-2 text-xs font-semibold"
                >
                  {showExercisePicker ? "Hide" : "Change"}
                </button>
              }
            />

            {showExercisePicker ? (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => setSelectedGroup("All")}
                    className="chip shrink-0 touch-target text-[11px] font-semibold"
                    style={
                      selectedGroup === "All"
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)",
                            borderColor: "rgba(255,255,255,0.14)",
                            color: "#FFFFFF",
                          }
                        : undefined
                    }
                  >
                    All
                    <span className={selectedGroup === "All" ? "text-white/70" : "text-text-dim"}>
                      {tracked.length}
                    </span>
                  </button>
                  {groupedExercises.map((group) => {
                    const groupColor = groupColors[group.label] || "#8F93A2";
                    const active = selectedGroup === group.label;

                    return (
                      <button
                        key={group.label}
                        type="button"
                        onClick={() => setSelectedGroup(group.label)}
                        className={`chip shrink-0 touch-target text-[11px] font-semibold ${
                          active ? "" : "chip-muted text-text-secondary"
                        }`}
                        style={
                          active
                            ? {
                                background: `linear-gradient(135deg, ${groupColor}20 0%, ${groupColor}38 100%)`,
                                borderColor: `${groupColor}66`,
                                color: groupColor,
                                boxShadow: `0 10px 20px ${groupColor}22`,
                              }
                            : undefined
                        }
                      >
                        {group.label}
                        <span className={active ? "opacity-70" : "text-text-dim"}>
                          {group.exercises.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="surface-card rounded-[1.75rem] p-3.5">
                  {visibleExercises.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {visibleExercises.map((visibleExercise) => (
                        <ExerciseChip
                          key={visibleExercise.id}
                          active={visibleExercise.id === activeId}
                          color={groupColors[getExerciseGroupLabel(visibleExercise.id)] || "#8F93A2"}
                          name={visibleExercise.name}
                          sessionCount={visibleExercise.sessionCount}
                          onClick={() => {
                            setSelectedId(visibleExercise.id);
                            setShowExercisePicker(false);
                            setShowAllSessions(false);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">
                      Nothing logged in this group yet.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="surface-card-muted rounded-[1.4rem] p-4">
                <p className="text-sm font-semibold text-text-primary">{exerciseTitle}</p>
                <p className="mt-1 text-sm leading-6 text-text-muted">
                  {selectedGroup === "All"
                    ? `Browsing ${tracked.length} tracked exercises.`
                    : `${visibleExercises.length} exercises in ${selectedGroup}.`}
                </p>
              </div>
            )}
          </section>

          {prs.length > 0 ? (
            <section className="flex flex-col gap-3 animate-fade-up">
            <SectionHeading
              eyebrow="Personal Bests"
              title={`${exerciseTitle} PRs`}
              description="All-time milestones from your logged history for this exercise."
            />
              <div className="grid gap-2" style={prGridStyle}>
                {prs.map((pr) => (
                  <PRBadge key={pr.type} pr={pr} color={color} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-3 animate-fade-up">
            <SectionHeading
              eyebrow="Trend"
              title={chartMode === "1rm" ? "Estimated 1RM trend" : "Volume trend"}
              description={
                sessions.length >= 2
                  ? `Last ${sessions.length} logged sessions for ${exerciseTitle}.`
                  : "Charts unlock after two logged sessions for the selected exercise."
              }
              trailing={
                <SegmentedControl
                  options={[
                    { value: "1rm", label: "Est. 1RM" },
                    { value: "volume", label: "Volume" },
                  ]}
                  value={chartMode}
                  onChange={(next) => setChartMode(next as "1rm" | "volume")}
                  compact
                />
              }
            />

            <div className="surface-card rounded-[1.85rem] p-4">
              {sessions.length >= 2 ? (
                <ResponsiveContainer width="100%" height={220} minWidth={0}>
                  {chartMode === "1rm" ? (
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "rgba(255,255,255,0.38)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "rgba(255,255,255,0.38)" }}
                        axisLine={false}
                        tickLine={false}
                        domain={["dataMin - 5", "dataMax + 5"]}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [`${value}kg`, "Est. 1RM"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2.75}
                        dot={{ fill: color, r: 4 }}
                        activeDot={{ r: 6, fill: color }}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "rgba(255,255,255,0.38)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "rgba(255,255,255,0.38)" }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [
                          Number(value) >= 1000
                            ? `${(Number(value) / 1000).toFixed(1)}k kg`
                            : `${value}kg`,
                          "Volume",
                        ]}
                      />
                      <Bar
                        dataKey="value"
                        fill={`${color}CC`}
                        radius={[10, 10, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="flex min-h-[220px] items-center justify-center">
                  <div className="surface-card-muted max-w-[18rem] rounded-[1.5rem] p-5 text-center">
                    <p className="text-sm font-semibold text-text-primary">
                      Need at least 2 sessions to show a chart.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-text-muted">
                      Keep logging this exercise and the trend view will fill in automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-3 animate-fade-up">
            <SectionHeading
              eyebrow="Recent Sessions"
              title={`${exerciseTitle} history`}
              description={
                showAllSessions
                  ? `Showing all ${sessions.length} logged sessions for ${exerciseTitle}.`
                  : `Showing the latest ${Math.min(3, sessions.length)} logged sessions for ${exerciseTitle}.`
              }
              trailing={
                sessions.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllSessions((value) => !value)}
                    className="btn-ghost px-3 py-2 text-xs font-semibold"
                  >
                    {showAllSessions ? "Show Less" : "Show All"}
                  </button>
                ) : (
                  <span className="chip chip-muted text-[11px] text-text-secondary">
                    {sessions.length} sessions
                  </span>
                )
              }
            />

            <div className="flex flex-col gap-2.5">
              {displayedSessions.map((session, index) => (
                  <div
                    key={`${session.date}-${index}`}
                    className="surface-card rounded-[1.6rem] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-semibold text-text-primary">
                            {formatDate(session.date)}
                          </p>
                          {index === 0 ? (
                            <span className="chip chip-muted min-h-0 px-2 py-1 text-[10px] font-semibold text-accent-blue">
                              Latest
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[12px] text-text-dim">
                          {session.totalSets} working sets logged
                        </p>
                      </div>

                      <div className="rounded-[1rem] border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-right">
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-dim">
                          Est. 1RM
                        </p>
                        <p
                          className="mt-1 text-[15px] font-semibold tabular-nums"
                          style={{ color }}
                        >
                          {session.estimated1RM}kg
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <StatCard
                        label="Best Set"
                        value={`${session.bestWeight}kg × ${session.bestReps}`}
                      />
                      <StatCard
                        label="Volume"
                        value={formatMetricValue(session.totalVolume)}
                      />
                      <StatCard label="Sets" value={`${session.totalSets}`} />
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </>
      )}
    </PageLayout>
  );
}
