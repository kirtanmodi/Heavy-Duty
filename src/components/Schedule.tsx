import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { getEffectiveExercise } from "../data/exercises";
import { getProgram } from "../data/programs";
import {
  addDaysToDateKey,
  createSessionIso,
  daysBetweenDateKeys,
  daysSinceLastSession,
  formatDateKey,
  formatDayDate,
  getIsoDateKey,
} from "../lib/dates";
import { getLiftDayGroups, getMuscleRecoveryStatus, getSmartProgramDaySuggestion } from "../lib/recovery";
import { getUpcomingRollingDays } from "../lib/rollingSchedule";
import { useWorkoutStore } from "../store/workoutStore";
import type { ProgramDay } from "../types";

const typeBadge: Record<string, { label: string; dot: string }> = {
  lift: { label: "Lift", dot: "bg-accent-green" },
  cardio: { label: "Cardio", dot: "bg-accent-blue" },
  recovery: { label: "Recovery", dot: "bg-accent-blue/60" },
  rest: { label: "Rest", dot: "bg-text-dim" },
};

function humanizeLabel(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getLoggedSummary(day: ProgramDay, activityName?: string): string {
  if (activityName) return `Already logged: ${activityName}.`;
  if (day.type === "lift") return "This date already has a logged lift session.";
  if (day.type === "rest") return "This date is already marked as rest.";
  if (day.type === "recovery") return "This date is already logged as recovery.";
  return "This date is already logged as cardio.";
}

function getCycleReason(cycleIndex: number, programDays: ProgramDay[]): string {
  const total = programDays.length;
  const day = programDays[cycleIndex];
  if (!day) return "";

  const prevLift = (() => {
    for (let i = 1; i < total; i++) {
      const d = programDays[(cycleIndex - i + total) % total];
      if (d.type === "lift") return d;
    }
    return null;
  })();

  const nextLift = (() => {
    for (let i = 1; i < total; i++) {
      const d = programDays[(cycleIndex + i) % total];
      if (d.type === "lift") return d;
    }
    return null;
  })();

  if (day.type === "lift") {
    const liftNum = programDays.filter((d, i) => d.type === "lift" && i <= cycleIndex).length;
    const liftTotal = programDays.filter((d) => d.type === "lift").length;
    return `Lift ${liftNum} of ${liftTotal} in your cycle. Day ${cycleIndex + 1} of ${total}.`;
  }

  if (day.type === "rest" && prevLift && nextLift) {
    return `Rest between ${prevLift.focus} and ${nextLift.focus}. Muscles need at least 48h before the next lift.`;
  }

  if (day.type === "rest" && prevLift) {
    return `Rest after ${prevLift.focus}. This closes your cycle before the next round starts.`;
  }

  if (day.type === "cardio") {
    return `Cardio after all 3 lifts. Keeps your heart healthy without taxing recovering muscles.`;
  }

  if (day.type === "recovery") {
    return `Active recovery to boost blood flow and speed up healing before the next cycle.`;
  }

  return `Day ${cycleIndex + 1} of ${total} in your cycle.`;
}

function StatusDot({ className }: { className: string }) {
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${className}`} aria-hidden />;
}

function DayTypeBadge({ type }: { type: string }) {
  const badge = typeBadge[type] ?? typeBadge.rest;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-fill px-2 py-0.5 text-[12px] font-medium leading-tight text-text-secondary">
      <StatusDot className={badge.dot} />
      {badge.label}
    </span>
  );
}

function RecoveryPill({
  group,
  daysSinceLastTrained,
  status,
}: {
  group: string;
  daysSinceLastTrained: number | null;
  status: "recovering" | "recovered" | "never";
}) {
  const isRecovering = status === "recovering";

  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      <StatusDot className={isRecovering ? "bg-accent-orange" : "bg-accent-green"} />
      <span className="text-text-secondary">{group}</span>
      <span className="tabular-nums text-text-muted">
        {daysSinceLastTrained === null ? "Never" : `${daysSinceLastTrained}d`}
      </span>
    </span>
  );
}

function DetailSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="section-label">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`h-[18px] w-[18px] ${className}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function Schedule() {
  const navigate = useNavigate();
  const activeWorkout = useWorkoutStore((state) => state.activeWorkout);
  const history = useWorkoutStore((state) => state.history);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showLegend, setShowLegend] = useState(false);
  const program = getProgram("heavy-duty-complete")!;
  const todayDateKey = formatDateKey(new Date());
  const firstProjectedDateKey = history.some((entry) => getIsoDateKey(entry.date) === todayDateKey)
    ? addDaysToDateKey(todayDateKey, 1)
    : todayDateKey;

  const recoveryStatuses = useMemo(() => getMuscleRecoveryStatus(history), [history]);
  const rollingDays = useMemo(
    () => getUpcomingRollingDays(program.days, history, program.days.length, firstProjectedDateKey),
    [program.days, history, firstProjectedDateKey],
  );
  const firstPlannedIndex = useMemo(
    () => rollingDays.findIndex((slot) => slot.source === "planned"),
    [rollingDays],
  );

  const renderDay = (
    { day, cycleIndex, dateKey, source, workout }: (typeof rollingDays)[number],
    index: number,
  ) => {
    const leadDays = daysBetweenDateKeys(dateKey, todayDateKey);
    const isLogged = source !== "planned";
    const isNextUp = index === firstPlannedIndex;
    const isExpanded = isNextUp || expandedDates.has(dateKey);
    const isRest = day.type === "rest";
    const daysAgo = daysSinceLastSession(day.id, history);
    const stalenessText =
      isLogged ? "Already logged" : daysAgo === null ? "Never done" : daysAgo === 0 ? "Done today" : `Last done ${daysAgo}d ago`;
    const leadTimeLabel =
      leadDays === 0 ? (isLogged ? "Today" : "Starts now") : leadDays === 1 ? "Tomorrow" : `In ${leadDays}d`;
    const compactStat =
      day.type === "lift"
        ? `${day.exercises.length} exercises`
        : day.duration ?? typeBadge[day.type]?.label ?? "Planned";
    const pillGroups =
      day.type === "lift"
        ? getLiftDayGroups(day)
            .map((group) => recoveryStatuses.find((status) => status.group === group))
            .filter((status): status is NonNullable<typeof status> => !!status)
        : recoveryStatuses.filter((status) => status.status !== "never");
    const smartSuggestion = isLogged
      ? null
      : getSmartProgramDaySuggestion(
          day,
          program.days,
          recoveryStatuses,
          leadDays <= 2,
        );
    const liftExercises =
      day.type === "lift"
        ? day.exercises
            .map((exerciseId) => getEffectiveExercise(exerciseId))
            .filter((exercise): exercise is NonNullable<typeof exercise> => !!exercise)
        : [];
    const toggleExpanded = () => {
      setExpandedDates((prev) => {
        const next = new Set(prev);
        if (next.has(dateKey)) next.delete(dateKey);
        else next.add(dateKey);
        return next;
      });
    };

    const dateLabel = formatDayDate(createSessionIso(dateKey));
    // Drop the stat when it would only repeat the type badge (e.g. "Rest").
    const statText = isLogged
      ? getLoggedSummary(day, workout?.activityName)
      : compactStat !== typeBadge[day.type]?.label
        ? compactStat
        : null;

    const loggedBadge = isLogged ? (
      <span className="shrink-0 rounded-full bg-accent-green/12 px-2 py-0.5 text-[12px] font-medium leading-tight text-accent-green">
        Logged
      </span>
    ) : null;

    // The Start button (or, while another session is active, the note that replaces it)
    // only appears on an open slot dated today.
    const startBlock =
      !isRest && !isLogged && leadDays === 0 ? (
        activeWorkout ? (
          <p className="px-4 pb-4 text-[13px] text-text-muted">
            Start unavailable · finish or cancel the active session first.
          </p>
        ) : (
          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={() => navigate(`/workout/${day.id}`)}
              className={`${isNextUp ? "btn-primary" : "btn-secondary"} w-full text-[15px]`}
            >
              Start workout
            </button>
          </div>
        )
      ) : null;

    const details = isExpanded ? (
      <div className={`flex flex-col gap-5 px-4 pb-4 ${isNextUp ? "pt-1" : ""}`}>
        <DetailSection label="Why this day">
          <p className="text-[14px] leading-relaxed text-text-secondary">
            {getCycleReason(cycleIndex, program.days)}
          </p>
          {!isLogged ? (
            <p className="mt-1 text-[13px] text-text-muted">{stalenessText}</p>
          ) : null}
        </DetailSection>

        {day.type === "lift" && liftExercises.length > 0 ? (
          <DetailSection label="Exercises">
            <div className="-mb-1 flex flex-col divide-y divide-separator">
              {liftExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="flex items-center justify-between gap-3 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] leading-snug text-text-primary">{exercise.name}</p>
                    <p className="truncate text-[12px] leading-snug text-text-muted">
                      {exercise.primaryMuscles.slice(0, 2).map(humanizeLabel).join(", ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] tabular-nums text-text-muted">
                    {exercise.repRange[0]}–{exercise.repRange[1]}
                  </span>
                </div>
              ))}
            </div>
          </DetailSection>
        ) : null}

        {(day.type === "cardio" || day.type === "recovery" || day.type === "rest") &&
        (day.description || day.tips) ? (
          <>
            {day.description ? (
              <DetailSection label="Plan">
                <p className="text-[14px] leading-relaxed text-text-secondary">{day.description}</p>
              </DetailSection>
            ) : null}
            {day.tips ? (
              <DetailSection label="Tip">
                <p className="text-[13px] leading-relaxed text-text-muted">{day.tips}</p>
              </DetailSection>
            ) : null}
          </>
        ) : null}

        {pillGroups.length > 0 ? (
          <DetailSection label="Recovery">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {pillGroups.map((status) => (
                <RecoveryPill
                  key={status.group}
                  group={status.group}
                  daysSinceLastTrained={status.daysSinceLastTrained}
                  status={status.status}
                />
              ))}
            </div>
          </DetailSection>
        ) : null}

        {!isLogged && smartSuggestion?.reason && smartSuggestion.suggestion ? (
          <div className="rounded-[0.875rem] bg-accent-orange/10 px-3.5 py-3">
            <p className="text-[13px] font-medium text-accent-orange">Recovery suggestion</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-text-secondary">
              {smartSuggestion.reason}. {smartSuggestion.suggestion}.
            </p>
          </div>
        ) : null}
      </div>
    ) : null;

    if (isNextUp) {
      return (
        <section
          key={`${day.id}-${dateKey}`}
          className="hero-surface rounded-[1.25rem] animate-fade-up"
          style={{ animationDelay: `${index * 35}ms` }}
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-text-muted">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-fill px-2 py-0.5 text-[12px] font-medium leading-tight text-text-primary">
                  <StatusDot className="bg-accent-red" />
                  Next up
                </span>
                {loggedBadge}
                <span>
                  {dateLabel} · {leadTimeLabel}
                </span>
              </div>
              <h3 className="mt-2 text-[20px] font-semibold leading-snug tracking-tight text-text-primary">
                {day.focus}
              </h3>
              {statText ? <p className="mt-0.5 text-[13px] text-text-muted">{statText}</p> : null}
            </div>
            <span className="flex shrink-0 pt-0.5">
              <DayTypeBadge type={day.type} />
            </span>
          </div>

          {startBlock}
          {details}
        </section>
      );
    }

    return (
      <div key={`${day.id}-${dateKey}`}>
        <div className="relative flex min-h-[3.75rem] items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="min-w-0 text-[15px] font-semibold leading-snug tracking-tight text-text-primary">
                {/* The pseudo-element stretches the toggle over the whole row. */}
                <button
                  type="button"
                  onClick={toggleExpanded}
                  aria-expanded={isExpanded}
                  className="text-left after:absolute after:inset-0 active:after:bg-fill focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-white/40"
                >
                  {day.focus}
                </button>
              </h3>
              {loggedBadge}
            </div>
            <p className="mt-0.5 text-[13px] text-text-muted">
              {dateLabel} · {leadTimeLabel}
              {statText ? ` · ${statText}` : ""}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5">
            <DayTypeBadge type={day.type} />
            <ChevronDownIcon
              className={`text-text-dim transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </span>
        </div>

        {details}
        {startBlock}
      </div>
    );
  };

  const beforeNextUp = firstPlannedIndex === -1 ? rollingDays : rollingDays.slice(0, firstPlannedIndex);
  const afterNextUp = firstPlannedIndex === -1 ? [] : rollingDays.slice(firstPlannedIndex + 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 animate-fade-up">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="section-label">Next {rollingDays.length} days</h2>
          <button
            type="button"
            onClick={() => setShowLegend((value) => !value)}
            aria-expanded={showLegend}
            className="btn-tertiary -mr-2 px-2 text-[13px]"
          >
            {showLegend ? "Hide legend" : "Legend"}
          </button>
        </div>

        {showLegend ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 pb-1 text-[13px] text-text-secondary animate-fade-in">
            <span className="inline-flex items-center gap-1.5">
              <StatusDot className="bg-accent-green" />
              Recovered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StatusDot className="bg-accent-orange" />
              Recovering
            </span>
          </div>
        ) : null}

        {activeWorkout ? (
          <div className="surface-card-muted flex items-start gap-2.5 rounded-[1.25rem] px-4 py-3">
            <StatusDot className="mt-[7px] bg-accent-red" />
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-text-primary">Workout in progress</p>
              <p className="mt-0.5 text-[13px] text-text-muted">
                Finish or cancel {activeWorkout.dayName} before starting another day from here.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {beforeNextUp.length > 0 ? (
        <div className="list-group animate-fade-up">
          {beforeNextUp.map((slot, index) => renderDay(slot, index))}
        </div>
      ) : null}

      {firstPlannedIndex !== -1 ? renderDay(rollingDays[firstPlannedIndex], firstPlannedIndex) : null}

      {afterNextUp.length > 0 ? (
        <div
          className="list-group animate-fade-up"
          style={{ animationDelay: `${(firstPlannedIndex + 1) * 35}ms` }}
        >
          {afterNextUp.map((slot, offset) => renderDay(slot, firstPlannedIndex + 1 + offset))}
        </div>
      ) : null}
    </div>
  );
}
