import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { exerciseGroups, getEffectiveExercise, muscleColors } from "../data/exercises";
import { getProgram } from "../data/programs";
import { daysSinceLastSession } from "../lib/dates";
import { getLiftDayGroups, getMuscleRecoveryStatus, getSmartDaySuggestion } from "../lib/recovery";
import { useWorkoutStore } from "../store/workoutStore";
import type { ProgramDay } from "../types";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const typeBadge: Record<
  string,
  { label: string; bg: string; border: string; text: string }
> = {
  lift: {
    label: "Lift",
    bg: "rgba(48, 209, 88, 0.12)",
    border: "rgba(48, 209, 88, 0.24)",
    text: "#30D158",
  },
  cardio: {
    label: "Cardio",
    bg: "rgba(10, 132, 255, 0.12)",
    border: "rgba(10, 132, 255, 0.24)",
    text: "#0A84FF",
  },
  recovery: {
    label: "Recovery",
    bg: "rgba(100, 210, 255, 0.12)",
    border: "rgba(100, 210, 255, 0.24)",
    text: "#64D2FF",
  },
  rest: {
    label: "Rest",
    bg: "rgba(255, 255, 255, 0.06)",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#A0A0A8",
  },
};

function getGroupPrimaryMuscle(groupLabel: string): string | undefined {
  const group = exerciseGroups.find((entry) => entry.label === groupLabel);
  return group?.muscles[0];
}

function humanizeLabel(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDaySummary(day: ProgramDay): string {
  if (day.type === "lift") {
    return `${day.exercises.length} planned exercises for your ${day.focus.toLowerCase()} day.`;
  }
  if (day.type === "cardio" || day.type === "recovery") {
    return day.description ?? day.focus;
  }
  return day.description ?? day.focus;
}

function DayTypeBadge({ type }: { type: string }) {
  const badge = typeBadge[type] ?? typeBadge.rest;

  return (
    <span
      className="inline-flex min-h-[2rem] items-center rounded-full border px-3 py-1 text-[11px] font-semibold"
      style={{
        background: badge.bg,
        borderColor: badge.border,
        color: badge.text,
      }}
    >
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
  const muscle = getGroupPrimaryMuscle(group);
  const baseColor = muscle ? muscleColors[muscle] : "#8F93A2";

  return (
    <span
      className="chip text-[11px]"
      style={{
        background: `${baseColor}${isRecovering ? "18" : "12"}`,
        borderColor: `${baseColor}${isRecovering ? "32" : "26"}`,
      }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: isRecovering ? "#FF9F0A" : "#30D158" }}
      />
      <span className="font-medium text-text-primary">{group}</span>
      <span className="text-text-dim">
        {daysSinceLastTrained === null ? "Never" : `${daysSinceLastTrained}d`}
      </span>
    </span>
  );
}

export function Schedule() {
  const navigate = useNavigate();
  const activeWorkout = useWorkoutStore((state) => state.activeWorkout);
  const history = useWorkoutStore((state) => state.history);
  const program = getProgram("heavy-duty-complete")!;
  const todayDow = new Date().getDay();

  const recoveryStatuses = useMemo(() => getMuscleRecoveryStatus(history), [history]);

  const sortedDays = [...program.days].sort((a, b) => {
    const aKey = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const bKey = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return aKey - bKey;
  });

  return (
    <div className="flex flex-col gap-3">
      <section className="surface-card rounded-[1.75rem] p-4 animate-fade-up">
        <p className="section-label">Week View</p>
        <h2 className="mt-2 text-[1.05rem] font-semibold text-text-primary">
          {program.name}
        </h2>
        <p className="section-caption mt-1 max-w-[24rem]">{program.description}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip chip-muted text-[11px] text-text-secondary">
            <span className="inline-block h-2 w-2 rounded-full bg-accent-green" />
            Recovered
          </span>
          <span className="chip chip-muted text-[11px] text-text-secondary">
            <span className="inline-block h-2 w-2 rounded-full bg-accent-orange" />
            Recovering
          </span>
        </div>

        {activeWorkout ? (
          <div className="surface-card-muted mt-3 rounded-[1.3rem] p-3.5">
            <p className="text-sm font-semibold text-text-primary">Workout in progress</p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Finish or cancel {activeWorkout.dayName} before starting another day from here.
            </p>
          </div>
        ) : null}
      </section>

      {sortedDays.map((day, index) => {
        const isToday = day.dayOfWeek === todayDow;
        const isRest = day.type === "rest";
        const daysAgo = daysSinceLastSession(day.id, history);
        const stalenessText =
          daysAgo === null ? "Never done" : daysAgo === 0 ? "Done today" : `Last done ${daysAgo}d ago`;
        const pillGroups =
          day.type === "lift"
            ? getLiftDayGroups(day)
                .map((group) => recoveryStatuses.find((status) => status.group === group))
                .filter((status): status is NonNullable<typeof status> => !!status)
            : recoveryStatuses.filter((status) => status.status !== "never");
        const smartSuggestion =
          day.type === "lift"
            ? getSmartDaySuggestion(day.dayOfWeek, 0, program.days, recoveryStatuses)
            : null;
        const liftExercises =
          day.type === "lift"
            ? day.exercises
                .map((exerciseId) => getEffectiveExercise(exerciseId))
                .filter((exercise): exercise is NonNullable<typeof exercise> => !!exercise)
            : [];

        return (
          <section
            key={day.id}
            className={`surface-card rounded-[1.75rem] p-4 animate-fade-up ${isToday ? "ring-1 ring-accent-red/40" : ""}`}
            style={{ animationDelay: `${index * 35}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-text-primary">
                    {dayNames[day.dayOfWeek]}
                  </span>
                  {isToday ? (
                    <span className="chip chip-muted min-h-0 px-2 py-1 text-[10px] font-semibold text-accent-red">
                      Today
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-[1.1rem] font-semibold tracking-[-0.02em] text-text-primary">
                  {day.focus}
                </h3>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {getDaySummary(day)}
                </p>
              </div>

              <DayTypeBadge type={day.type} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip chip-muted text-[11px] text-text-secondary">
                {stalenessText}
              </span>
              {day.type === "lift" ? (
                <span className="chip chip-muted text-[11px] text-text-secondary">
                  {day.exercises.length} exercises
                </span>
              ) : null}
              {day.duration ? (
                <span className="chip chip-muted text-[11px] text-text-secondary">
                  {day.duration}
                </span>
              ) : null}
            </div>

            {day.type === "lift" && liftExercises.length > 0 ? (
              <div className="surface-card-muted mt-4 rounded-[1.35rem] p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="section-label">Exercises</p>
                  <span className="text-[11px] text-text-dim">{liftExercises.length} planned</span>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {liftExercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="flex items-center justify-between gap-3 rounded-[1rem] bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-text-primary">
                          {exercise.name}
                        </p>
                        <p className="mt-1 text-[11px] text-text-dim">
                          {exercise.primaryMuscles.slice(0, 2).map(humanizeLabel).join(", ")}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium tabular-nums text-text-secondary">
                        {exercise.repRange[0]}-{exercise.repRange[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {(day.type === "cardio" || day.type === "recovery" || day.type === "rest") &&
            (day.description || day.tips) ? (
              <div className="surface-card-muted mt-4 rounded-[1.35rem] p-3.5">
                {day.description ? (
                  <p className="text-sm leading-6 text-text-secondary">{day.description}</p>
                ) : null}
                {day.tips ? (
                  <div className={day.description ? "mt-3 border-t border-white/[0.06] pt-3" : ""}>
                    <p className="section-label">Tip</p>
                    <p className="mt-1 text-sm leading-6 text-text-muted">{day.tips}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {pillGroups.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="section-label">Recovery</p>
                  <span className="text-[11px] text-text-dim">
                    {day.type === "lift" ? "Targeted groups" : "Current status"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {pillGroups.map((status) => (
                    <RecoveryPill
                      key={status.group}
                      group={status.group}
                      daysSinceLastTrained={status.daysSinceLastTrained}
                      status={status.status}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {smartSuggestion?.reason && smartSuggestion.suggestion ? (
              <div className="mt-4 rounded-[1.25rem] border border-accent-orange/20 bg-accent-orange/10 px-3.5 py-3">
                <p className="text-[12px] font-semibold text-accent-orange">Recovery suggestion</p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {smartSuggestion.reason}. {smartSuggestion.suggestion}.
                </p>
              </div>
            ) : null}

            {!isRest ? (
              activeWorkout ? (
                <div className="surface-card-muted mt-4 rounded-[1.25rem] p-3.5">
                  <p className="text-sm font-semibold text-text-primary">
                    Start unavailable
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    Finish or cancel the active session first.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/workout/${day.id}`)}
                  className="btn-primary mt-4 w-full text-sm font-semibold"
                >
                  Start Workout
                </button>
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
