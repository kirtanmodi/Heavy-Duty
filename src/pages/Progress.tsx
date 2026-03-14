import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PageLayout } from "../components/layout/PageLayout";
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

const prIcons: Record<string, string> = {
  weight: "W",
  "1rm": "1",
  volume: "V",
};

function PRBadge({ pr, color }: { pr: PRRecord; color: string }) {
  const labels = {
    weight: "Best Weight",
    "1rm": "Est. 1RM",
    volume: "Best Volume",
  };
  const units = {
    weight: `${pr.value}kg${pr.reps ? ` × ${pr.reps}` : ""}`,
    "1rm": `${pr.value}kg`,
    volume:
      pr.value >= 1000
        ? `${(pr.value / 1000).toFixed(1)}k kg`
        : `${pr.value}kg`,
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-white/[0.04] p-3 relative overflow-hidden">
      <div
        className="absolute top-0 left-0 w-full h-[2px]"
        style={{ background: color }}
      />
      <div className="flex items-center gap-1.5">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold"
          style={{ background: `${color}22`, color }}
        >
          {prIcons[pr.type]}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          {labels[pr.type]}
        </span>
      </div>
      <span
        className="font-[var(--font-display)] text-xl tabular-nums"
        style={{ color }}
      >
        {units[pr.type]}
      </span>
      <span className="text-[10px] text-text-dim">{formatPRDate(pr.date)}</span>
    </div>
  );
}

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

export function Progress() {
  const history = useWorkoutStore((s) => s.history);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>("All");
  const [chartMode, setChartMode] = useState<"1rm" | "volume">("1rm");

  const tracked = useMemo(() => getTrackedExercises(history), [history]);

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

  const sessions = useMemo(
    () => (activeId ? getExerciseSessions(activeId, history) : []),
    [activeId, history],
  );

  const prs = useMemo(
    () => (activeId ? getExercisePRs(activeId, history) : []),
    [activeId, history],
  );

  const exercise = activeId ? getEffectiveExercise(activeId) : null;
  const color = exercise
    ? muscleColors[exercise.primaryMuscles[0] as MuscleGroup] || "#888"
    : "#888";

  const chartData = sessions.map((s) => ({
    date: formatDate(s.date),
    value: chartMode === "1rm" ? s.estimated1RM : s.totalVolume,
    weight: s.bestWeight,
    reps: s.bestReps,
  }));

  if (tracked.length === 0) {
    return (
      <PageLayout className="flex flex-col gap-5">
        <header className="pt-1">
          <h1 className="font-[var(--font-display)] text-[2rem] tracking-wider text-text-primary">
            Progress
          </h1>
        </header>
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-bg-card p-8 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-10 w-10 text-text-dim"
          >
            <path
              d="M3 3v18h18M7 16l4-4 4 4 5-5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm text-text-secondary">
            Complete some workouts to see your progress here.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="flex flex-col gap-4">
      <header className="pt-1">
        <h1 className="font-[var(--font-display)] text-[2rem] tracking-wider text-text-primary">
          Progress
        </h1>
      </header>

      {/* Muscle group tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        <button
          onClick={() => setSelectedGroup("All")}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-all ${
            selectedGroup === "All"
              ? "bg-white/[0.12] text-text-primary"
              : "text-text-muted"
          }`}
        >
          All
        </button>
        {groupedExercises.map((g) => {
          const isActive = selectedGroup === g.label;
          const gc = groupColors[g.label] || "#888";
          return (
            <button
              key={g.label}
              onClick={() => setSelectedGroup(g.label)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-all ${
                isActive ? "text-white" : "text-text-muted"
              }`}
              style={
                isActive
                  ? { background: `${gc}30`, color: gc }
                  : {}
              }
            >
              {g.label}
              <span className="ml-1 text-[10px] opacity-50">
                {g.exercises.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Exercise picker — grouped or flat depending on filter */}
      {selectedGroup === "All" ? (
        <div className="flex flex-col gap-3">
          {groupedExercises.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: groupColors[group.label] || "#888",
                  }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-dim">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-white/[0.04]" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {group.exercises.map((ex) => {
                  const isActive = ex.id === activeId;
                  const gc = groupColors[group.label] || "#888";
                  return (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedId(ex.id)}
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                        isActive
                          ? "text-white shadow-lg"
                          : "bg-white/[0.03] text-text-muted border border-white/[0.04] hover:border-white/[0.08]"
                      }`}
                      style={
                        isActive
                          ? {
                              background: `linear-gradient(135deg, ${gc}DD, ${gc}99)`,
                              boxShadow: `0 2px 12px ${gc}33`,
                            }
                          : {}
                      }
                    >
                      {ex.name}
                      {ex.sessionCount > 1 && (
                        <span
                          className={`ml-1.5 text-[10px] ${
                            isActive ? "opacity-70" : "opacity-40"
                          }`}
                        >
                          {ex.sessionCount}x
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-1.5 flex-wrap">
          {visibleExercises.map((ex) => {
            const isActive = ex.id === activeId;
            const gc = groupColors[selectedGroup] || "#888";
            return (
              <button
                key={ex.id}
                onClick={() => setSelectedId(ex.id)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                  isActive
                    ? "text-white shadow-lg"
                    : "bg-white/[0.03] text-text-muted border border-white/[0.04] hover:border-white/[0.08]"
                }`}
                style={
                  isActive
                    ? {
                        background: `linear-gradient(135deg, ${gc}DD, ${gc}99)`,
                        boxShadow: `0 2px 12px ${gc}33`,
                      }
                    : {}
                }
              >
                {ex.name}
                {ex.sessionCount > 1 && (
                  <span
                    className={`ml-1.5 text-[10px] ${
                      isActive ? "opacity-70" : "opacity-40"
                    }`}
                  >
                    {ex.sessionCount}x
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Active exercise header */}
      {exercise && (
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-1 rounded-full"
            style={{ background: color }}
          />
          <div className="flex flex-col">
            <span className="font-[var(--font-display)] text-lg tracking-wide text-text-primary">
              {exercise.name}
            </span>
            <span className="text-[11px] text-text-dim">
              {exercise.primaryMuscles
                .map((m) => m.replace(/-/g, " "))
                .join(", ")}{" "}
              · {exercise.equipment} · {exercise.type}
            </span>
          </div>
        </div>
      )}

      {/* PR badges */}
      {prs.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {prs.map((pr) => (
            <PRBadge key={pr.type} pr={pr} color={color} />
          ))}
        </div>
      )}

      {/* Chart mode toggle */}
      <div className="flex items-center gap-1 rounded-lg bg-white/[0.03] p-1 self-start">
        <button
          onClick={() => setChartMode("1rm")}
          className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            chartMode === "1rm"
              ? "bg-white/[0.1] text-text-primary"
              : "text-text-dim"
          }`}
        >
          Est. 1RM
        </button>
        <button
          onClick={() => setChartMode("volume")}
          className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            chartMode === "volume"
              ? "bg-white/[0.1] text-text-primary"
              : "text-text-dim"
          }`}
        >
          Volume
        </button>
      </div>

      {/* Chart */}
      {sessions.length >= 2 ? (
        <div className="rounded-2xl bg-bg-card p-4 card-surface">
          <ResponsiveContainer width="100%" height={220}>
            {chartMode === "1rm" ? (
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                  domain={["dataMin - 5", "dataMax + 5"]}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,20,24,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "white",
                  }}
                  formatter={(value) => [`${value}kg`, "Est. 1RM"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2.5}
                  dot={{ fill: color, r: 4 }}
                  activeDot={{ r: 6, fill: color }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,20,24,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "white",
                  }}
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
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-2xl bg-bg-card p-6 text-center text-sm text-text-muted card-surface">
          Need at least 2 sessions to show a chart.
        </div>
      )}

      {/* Session history */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">
          Recent Sessions
        </span>
        {sessions
          .slice()
          .reverse()
          .map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium text-text-primary">
                  {formatDate(s.date)}
                </span>
                <span className="text-[11px] text-text-dim">
                  {s.totalSets} sets · {s.bestWeight}kg × {s.bestReps}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span
                  className="text-[13px] font-bold tabular-nums"
                  style={{ color }}
                >
                  {s.estimated1RM}kg
                </span>
                <span className="text-[10px] text-text-dim">est. 1RM</span>
              </div>
            </div>
          ))}
      </div>
    </PageLayout>
  );
}
