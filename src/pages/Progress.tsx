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
import { muscleColors, getEffectiveExercise } from "../data/exercises";
import { useWorkoutStore } from "../store/workoutStore";
import type { PRRecord } from "../lib/charts";

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

function PRBadge({ pr }: { pr: PRRecord }) {
  const labels = {
    weight: "Best Weight",
    "1rm": "Est. 1RM",
    volume: "Best Volume",
  };
  const units = {
    weight: `${pr.value}kg${pr.reps ? ` × ${pr.reps}` : ""}`,
    "1rm": `${pr.value}kg`,
    volume: pr.value >= 1000 ? `${(pr.value / 1000).toFixed(1)}k kg` : `${pr.value}kg`,
  };

  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white/[0.04] p-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
        {labels[pr.type]}
      </span>
      <span className="font-[var(--font-display)] text-xl tabular-nums text-accent-yellow">
        {units[pr.type]}
      </span>
      <span className="text-[10px] text-text-dim">{formatPRDate(pr.date)}</span>
    </div>
  );
}

export function Progress() {
  const history = useWorkoutStore((s) => s.history);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<"1rm" | "volume">("1rm");

  const tracked = useMemo(() => getTrackedExercises(history), [history]);

  // Auto-select first exercise
  const activeId = selectedId ?? tracked[0]?.id ?? null;

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
    ? muscleColors[exercise.primaryMuscles[0]] || "#888"
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
    <PageLayout className="flex flex-col gap-5">
      <header className="pt-1">
        <h1 className="font-[var(--font-display)] text-[2rem] tracking-wider text-text-primary">
          Progress
        </h1>
      </header>

      {/* Exercise picker */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tracked.map((ex) => {
          const isActive = ex.id === activeId;
          const exDef = getEffectiveExercise(ex.id);
          const c = exDef
            ? muscleColors[exDef.primaryMuscles[0]] || "#888"
            : "#888";

          return (
            <button
              key={ex.id}
              onClick={() => setSelectedId(ex.id)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-[12px] font-medium transition-all ${
                isActive
                  ? "text-white"
                  : "border border-white/[0.06] bg-white/[0.03] text-text-muted"
              }`}
              style={isActive ? { background: `${c}CC` } : {}}
            >
              {ex.name}
            </button>
          );
        })}
      </div>

      {/* PR badges */}
      {prs.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {prs.map((pr) => (
            <PRBadge key={pr.type} pr={pr} />
          ))}
        </div>
      )}

      {/* Chart mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setChartMode("1rm")}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            chartMode === "1rm"
              ? "bg-white/[0.1] text-text-primary"
              : "text-text-dim"
          }`}
        >
          Est. 1RM
        </button>
        <button
          onClick={() => setChartMode("volume")}
          className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
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
