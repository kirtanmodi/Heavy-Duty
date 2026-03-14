import { useNavigate } from "react-router-dom";
import { useWorkoutStore } from "../store/workoutStore";
import { getEffectiveExercise } from "../data/exercises";
import { getProgram } from "../data/programs";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const typeBadge: Record<string, { bg: string; text: string; label: string }> = {
  lift: { bg: "bg-accent-green/15", text: "text-accent-green", label: "Lift" },
  cardio: { bg: "bg-accent-blue/15", text: "text-accent-blue", label: "Cardio" },
  recovery: { bg: "bg-accent-blue/10", text: "text-accent-blue/70", label: "Recovery" },
  rest: { bg: "bg-text-dim/15", text: "text-text-muted", label: "Rest" },
};

export function Schedule() {
  const navigate = useNavigate();
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const program = getProgram("heavy-duty-complete")!;

  const todayDow = new Date().getDay();

  // Sort days Mon(1) → Sun(0)
  const sortedDays = [...program.days].sort((a, b) => {
    const aKey = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const bKey = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return aKey - bKey;
  });

  return (
    <div className="flex flex-col gap-2">
      {sortedDays.map((day) => {
        const badge = typeBadge[day.type] ?? typeBadge.rest;
        const isToday = day.dayOfWeek === todayDow;
        const isRest = day.type === "rest";

        return (
          <div
            key={day.id}
            className={`rounded-xl bg-bg-card p-4 card-surface ${isToday ? "ring-1 ring-accent-red/40" : ""}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  {dayNames[day.dayOfWeek]}
                </span>
                {isToday && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-accent-red">Today</span>
                )}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>

            {/* Focus */}
            <p className="mt-1 text-xs font-medium text-text-secondary">{day.focus}</p>

            {/* Content by type */}
            {day.type === "lift" && day.exercises.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {day.exercises.map((exId) => {
                  const ex = getEffectiveExercise(exId);
                  if (!ex) return null;
                  return (
                    <div key={exId} className="flex items-center justify-between">
                      <span className="text-[11px] text-text-muted">{ex.name}</span>
                      <span className="text-[10px] tabular-nums text-text-dim">
                        {ex.repRange[0]}-{ex.repRange[1]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {(day.type === "cardio" || day.type === "recovery") && day.description && (
              <div className="mt-2">
                <p className="text-[11px] text-text-muted">{day.description}</p>
                {day.duration && (
                  <p className="mt-1 text-[10px] text-text-dim">{day.duration}</p>
                )}
              </div>
            )}

            {day.type === "rest" && day.tips && (
              <p className="mt-2 text-[11px] text-text-muted">{day.tips}</p>
            )}

            {/* Start button (not for rest days, not when another workout is active) */}
            {!isRest && !activeWorkout && (
              <button
                onClick={() => navigate(`/workout/${day.id}`)}
                className="mt-3 w-full rounded-lg bg-bg-input py-2 text-xs font-semibold text-text-secondary transition-colors active:bg-bg-primary"
              >
                Start Workout
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
