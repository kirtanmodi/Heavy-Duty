import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BarShapeProps } from "recharts";
import { PageLayout } from "../components/layout/PageLayout";
import { Schedule } from "../components/Schedule";
import {
  getTrackedExercises,
  getExerciseSessions,
  getExercisePRs,
} from "../lib/charts";
import { getEffectiveExercise, exerciseGroups } from "../data/exercises";
import { formatDayDate } from "../lib/dates";
import { useWorkoutStore } from "../store/workoutStore";
import type { PRRecord } from "../lib/charts";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Mon · Sep 28", with the year appended only when it isn't the current year. */
function formatListDate(iso: string): string {
  const year = new Date(iso).getFullYear();
  return year === new Date().getFullYear()
    ? formatDayDate(iso)
    : `${formatDayDate(iso)}, ${year}`;
}

function formatMetricValue(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k kg` : `${value}kg`;
}

function formatAxisVolume(value: number): string {
  return value >= 1000 ? `${Number((value / 1000).toFixed(1))}k` : `${value}`;
}

function humanizeLabel(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

const CHART_ACCENT = "#ff453a";
const AXIS_TICK = { fontSize: 11, fill: "#85858d" };
const GRID_STROKE = "rgba(255,255,255,0.05)";

const tooltipStyle = {
  background: "#1c1c1f",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  fontSize: "13px",
  color: "#ededef",
  padding: "8px 12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};
const tooltipLabelStyle = { color: "#85858d", marginBottom: 2 };
const tooltipItemStyle = { color: "#ededef", padding: 0 };

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

function splitMetric(value: number, mode: "1rm" | "volume"): { amount: string; unit: string } {
  if (mode === "volume" && value >= 1000) {
    return { amount: `${(value / 1000).toFixed(1)}k`, unit: "kg" };
  }
  return { amount: `${value}`, unit: "kg" };
}

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`h-[18px] w-[18px] ${className}`}
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-3 px-1">
      <h2 className="section-label">{children}</h2>
      {action}
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
  // Full-width: 44px pill with 34px segments. Compact: 40px pill with 32px segments.
  // Each segment's hit area is stretched to 44px with an invisible pseudo-element.
  const containerSize = compact ? "h-10 p-[3px]" : "h-11 p-1";
  const buttonSize = compact
    ? "px-3 text-[13px] before:-inset-y-1.5"
    : "px-4 text-[14px] before:-inset-y-[5px]";

  return (
    <div
      className={`segmented-surface ${fullWidth ? "flex w-full" : "inline-flex shrink-0"} ${containerSize} gap-1 rounded-full`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`${fullWidth ? "flex-1" : ""} relative h-full rounded-full font-medium transition-colors before:absolute before:inset-x-0 ${buttonSize} ${active ? "segmented-active" : "text-text-muted active:text-text-secondary"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 pt-12 text-center animate-fade-up">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-7 w-7 text-text-muted"
      >
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 4 4 5-5" />
      </svg>
      <div className="max-w-[18rem]">
        <h2 className="section-title">{title}</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-text-muted">{description}</p>
      </div>
    </div>
  );
}

const prLabels: Record<PRRecord["type"], string> = {
  weight: "Best weight",
  "1rm": "Est. 1RM",
  volume: "Best volume",
};

function PRRow({ pr }: { pr: PRRecord }) {
  const values = {
    weight: `${pr.value}kg${pr.reps ? ` × ${pr.reps}` : ""}`,
    "1rm": `${pr.value}kg`,
    volume: formatMetricValue(pr.value),
  };

  return (
    <div className="flex min-h-[3.25rem] items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium leading-snug text-text-primary">
          {prLabels[pr.type]}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-text-muted">{formatListDate(pr.date)}</p>
      </div>
      <p className="shrink-0 text-right text-[15px] font-semibold tabular-nums text-text-primary">
        {values[pr.type]}
      </p>
    </div>
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

  const chartData = sessions.map((s) => ({
    date: formatDate(s.date),
    value: chartMode === "1rm" ? s.estimated1RM : s.totalVolume,
    weight: s.bestWeight,
    reps: s.bestReps,
  }));

  const latestSession = sessions[sessions.length - 1] ?? null;
  const latestChartPoint = chartData[chartData.length - 1] ?? null;
  const latestMetric = latestChartPoint ? splitMetric(latestChartPoint.value, chartMode) : null;
  const chartCaption = [
    chartMode === "1rm" ? "Est. 1RM" : "Volume",
    `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`,
    latestSession ? `latest ${formatDate(latestSession.date)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const exerciseTitle = exercise?.name ?? activeTrackedExercise?.name ?? "Exercise";
  const exerciseMeta = exercise
    ? `${exercise.primaryMuscles.map(humanizeLabel).join(", ")} · ${humanizeLabel(exercise.equipment)} · ${humanizeLabel(exercise.type)}`
    : "Saved from workout history";
  const collapsedSessionCount = Math.min(2, sessions.length);
  const displayedSessions = useMemo(
    () => (showAllSessions ? sessions.slice().reverse() : sessions.slice().reverse().slice(0, collapsedSessionCount)),
    [sessions, showAllSessions, collapsedSessionCount],
  );

  return (
    <PageLayout className="flex flex-col gap-7">
      <header className="flex flex-col gap-4 pt-2">
        <div className="px-1">
          <h1 className="page-title">Progress</h1>
          <p className="mt-1 text-[13px] tabular-nums text-text-muted">
            {tracked.length} {tracked.length === 1 ? "exercise" : "exercises"}
          </p>
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
        <EmptyState
          title="No progress yet"
          description="Log a few workouts to unlock charts and PRs."
        />
      ) : (
        <>
          <section className="px-1 animate-fade-up">
            <h2 className="-ml-1">
              <button
                type="button"
                onClick={() => setShowExercisePicker((value) => !value)}
                aria-expanded={showExercisePicker}
                aria-haspopup="dialog"
                className="flex min-h-11 max-w-full items-center gap-1.5 rounded-[0.875rem] px-1 text-left active:bg-fill"
              >
                <span className="min-w-0 text-[22px] font-semibold leading-tight tracking-tight text-text-primary">
                  {exerciseTitle}
                </span>
                <ChevronDownIcon
                  className={`h-5 w-5 shrink-0 text-text-muted transition-transform ${showExercisePicker ? "rotate-180" : ""}`}
                />
                <span className="sr-only">
                  {showExercisePicker ? ", hide exercise picker" : ", change exercise"}
                </span>
              </button>
            </h2>
            <p className="-mt-1 text-[13px] text-text-muted">{exerciseMeta}</p>
          </section>

          {showExercisePicker ? (
            <>
              <div
                className="fixed inset-0 z-[60] bg-black/60 animate-fade-in"
                onClick={() => setShowExercisePicker(false)}
                aria-hidden
              />
              <div className="fixed inset-x-0 bottom-0 z-[70] animate-slide-up">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="exercise-picker-title"
                  className="sheet-surface mx-auto flex max-h-[78dvh] max-w-[460px] flex-col rounded-t-[1.25rem] border-b-0"
                >
                  <div className="shrink-0 px-5 pt-3">
                    <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-fill-strong" aria-hidden />
                    <div className="flex min-h-6 items-center justify-between gap-3 px-1">
                      <h2 id="exercise-picker-title" className="section-title">
                        Choose exercise
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowExercisePicker(false)}
                        className="btn-tertiary -my-2.5 -mr-3 px-3 text-[15px] text-text-primary"
                      >
                        Done
                      </button>
                    </div>
                    <div
                      role="group"
                      aria-label="Filter by muscle group"
                      className="scrollbar-hide -mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-2"
                    >
                      {[
                        { label: "All", count: tracked.length },
                        ...groupedExercises.map((group) => ({
                          label: group.label,
                          count: group.exercises.length,
                        })),
                      ].map((group) => {
                        const active = selectedGroup === group.label;
                        return (
                          <button
                            key={group.label}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSelectedGroup(group.label)}
                            className="group flex min-h-11 shrink-0 items-center"
                          >
                            <span
                              className={`chip h-9 px-3.5 font-medium transition-colors ${
                                active
                                  ? "bg-[#f4f4f5] text-[#0b0b0c]"
                                  : "text-text-secondary group-active:bg-fill-strong"
                              }`}
                            >
                              {group.label}
                              <span
                                className={`tabular-nums ${active ? "text-[#0b0b0c]/55" : "text-text-muted"}`}
                              >
                                {group.count}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1"
                    style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
                  >
                    <div className="list-group">
                      {visibleExercises.length > 0 ? (
                        visibleExercises.map((visibleExercise) => {
                          const active = visibleExercise.id === activeId;
                          return (
                            <button
                              key={visibleExercise.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => {
                                setSelectedId(visibleExercise.id);
                                setShowExercisePicker(false);
                                setShowAllSessions(false);
                              }}
                              className="flex min-h-[3.25rem] w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-fill"
                            >
                              <span
                                className={`truncate text-[15px] text-text-primary ${active ? "font-medium" : ""}`}
                              >
                                {visibleExercise.name}
                              </span>
                              <span className="flex shrink-0 items-center gap-3">
                                <span className="text-[13px] tabular-nums text-text-muted">
                                  {visibleExercise.sessionCount}{" "}
                                  {visibleExercise.sessionCount === 1 ? "session" : "sessions"}
                                </span>
                                <span className="flex w-[18px] justify-center">
                                  {active ? <CheckIcon className="text-text-primary" /> : null}
                                </span>
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <p className="px-4 py-3.5 text-[15px] text-text-muted">
                          Nothing logged in this group yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <section className="surface-card flex flex-col gap-4 rounded-[1.25rem] p-4 animate-fade-up">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="stat-value min-w-0 truncate text-[28px] text-text-primary">
                  {latestMetric ? (
                    <>
                      {latestMetric.amount}
                      <span className="ml-1 text-[15px] font-medium tracking-normal text-text-muted">
                        {latestMetric.unit}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                <SegmentedControl
                  options={[
                    { value: "1rm", label: "1RM" },
                    { value: "volume", label: "Volume" },
                  ]}
                  value={chartMode}
                  onChange={(next) => setChartMode(next as "1rm" | "volume")}
                  compact
                />
              </div>
              <p className="mt-1 text-[13px] text-text-muted">{chartCaption}</p>
            </div>

            {sessions.length >= 2 ? (
              <div className="-mx-1">
                <ResponsiveContainer width="100%" height={200} minWidth={0}>
                  {chartMode === "1rm" ? (
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="progress-1rm-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity={0.22} />
                          <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                      <XAxis
                        dataKey="date"
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={8}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                        domain={[
                          (dataMin: number) => Math.floor((dataMin - 5) / 5) * 5,
                          (dataMax: number) => Math.ceil((dataMax + 5) / 5) * 5,
                        ]}
                        tickCount={4}
                        width={36}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelStyle={tooltipLabelStyle}
                        itemStyle={tooltipItemStyle}
                        cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
                        formatter={(value) => [`${value}kg`, "Est. 1RM"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={CHART_ACCENT}
                        strokeWidth={2}
                        fill="url(#progress-1rm-fill)"
                        dot={{ r: 2.5, fill: CHART_ACCENT, stroke: "none" }}
                        activeDot={{ r: 5, fill: CHART_ACCENT, stroke: "#151517", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                      <XAxis
                        dataKey="date"
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={8}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={AXIS_TICK}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value: number) => formatAxisVolume(value)}
                        tickCount={4}
                        width={36}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelStyle={tooltipLabelStyle}
                        itemStyle={tooltipItemStyle}
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        formatter={(value) => [
                          Number(value) >= 1000
                            ? `${(Number(value) / 1000).toFixed(1)}k kg`
                            : `${value}kg`,
                          "Volume",
                        ]}
                      />
                      <Bar
                        dataKey="value"
                        maxBarSize={28}
                        shape={(props: BarShapeProps) => (
                          <Rectangle
                            x={props.x}
                            y={props.y}
                            width={props.width}
                            height={props.height}
                            radius={[6, 6, 0, 0]}
                            fill={props.index === chartData.length - 1 ? CHART_ACCENT : "rgba(255,255,255,0.16)"}
                          />
                        )}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex min-h-[8.5rem] items-center justify-center px-6 text-center">
                <p className="text-[15px] text-text-muted">
                  Need at least 2 sessions to show a chart.
                </p>
              </div>
            )}
          </section>

          {prs.length > 0 ? (
            <section className="flex flex-col gap-2.5 animate-fade-up">
              <SectionLabel>Personal bests</SectionLabel>
              <div className="list-group">
                {prs.map((pr) => (
                  <PRRow key={pr.type} pr={pr} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-2.5 animate-fade-up">
            <SectionLabel
              action={<span className="pr-3 text-[13px] text-text-muted">Est. 1RM</span>}
            >
              Recent sessions
            </SectionLabel>

            <div className="list-group">
              {displayedSessions.map((session, index) => (
                <div
                  key={`${session.date}-${index}`}
                  className="flex min-h-[3.25rem] items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium leading-snug text-text-primary">
                      {formatListDate(session.date)}
                    </p>
                    <p className="mt-0.5 text-[13px] tabular-nums text-text-muted">
                      {session.totalSets} working sets · {session.bestWeight}kg × {session.bestReps} ·{" "}
                      {formatMetricValue(session.totalVolume)}
                    </p>
                  </div>

                  <p className="shrink-0 text-right text-[15px] font-semibold tabular-nums text-text-primary">
                    {session.estimated1RM}kg
                  </p>
                </div>
              ))}
            </div>

            {sessions.length > collapsedSessionCount ? (
              <button
                type="button"
                onClick={() => setShowAllSessions((value) => !value)}
                aria-expanded={showAllSessions}
                className="btn-tertiary self-center px-4 text-[14px]"
              >
                {showAllSessions ? "Show less" : `Show all ${sessions.length}`}
                <ChevronDownIcon
                  className={`h-4 w-4 text-text-muted transition-transform ${showAllSessions ? "rotate-180" : ""}`}
                />
              </button>
            ) : null}
          </section>
        </>
      )}
    </PageLayout>
  );
}
