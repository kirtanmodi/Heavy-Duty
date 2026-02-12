import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getExercise } from "../data/exercises";
import { getProgram } from "../data/programs";
import { useWorkoutStore } from "../store/workoutStore";

const fullDayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Home() {
  const navigate = useNavigate();
  const clearWorkouts = useWorkoutStore((s) => s.clearAll);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const program = getProgram('heavy-duty-complete')!;
  const todayDow = new Date().getDay();

  const sortedDays = [...program.days].sort(
    (a, b) => ((a.dayOfWeek - todayDow + 7) % 7) - ((b.dayOfWeek - todayDow + 7) % 7)
  );

  const getExerciseCount = (exerciseIds: string[]) => exerciseIds.filter((id) => getExercise(id)).length;

  const handleClearAll = () => {
    clearWorkouts();
    setShowClearConfirm(false);
    window.location.reload();
  };

  return (
    <PageLayout className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 pt-2">
        <p className="text-xs text-text-muted">Heavy Duty</p>
        <h1 className="font-[var(--font-display)] text-4xl leading-none text-text-primary">Train smarter.</h1>
      </header>

      <section className="flex flex-col gap-4">
        {sortedDays.map((day) => {
          const isToday = day.dayOfWeek === todayDow;
          const isLift = day.type === "lift";

          return (
            <div
              key={day.id}
              className={`rounded-2xl border p-6 ${
                isToday ? "border-accent-red/30 bg-accent-red/5" : "border-border-card bg-bg-card"
              }`}
            >
              <div className="flex flex-col gap-4">
                <p className={`text-sm font-medium ${isToday ? "text-accent-red" : "text-text-muted"}`}>
                  {isToday ? `Today · ${fullDayLabels[day.dayOfWeek]}` : fullDayLabels[day.dayOfWeek]}
                </p>

                <h2 className="font-[var(--font-display)] text-[1.75rem] leading-[1.12] text-text-primary">
                  {day.focus}
                </h2>

                {isLift && (
                  <p className="text-base text-text-secondary">{getExerciseCount(day.exercises)} exercises planned.</p>
                )}

                {!isLift && (
                  <p className="text-base leading-relaxed text-text-secondary">
                    {[day.duration, day.description].filter(Boolean).join(" · ")}
                  </p>
                )}

                {day.tips && <p className="text-base leading-relaxed text-text-muted">{day.tips}</p>}

                {isLift && (
                  <button
                    onClick={() => navigate(`/workout/${day.id}`)}
                    className={`w-full rounded-xl py-4 text-base font-semibold active:scale-[0.99] ${
                      isToday
                        ? "bg-accent-red text-white"
                        : "border border-border bg-bg-input text-text-primary"
                    }`}
                  >
                    Start Workout
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        {showClearConfirm ? (
          <div className="flex flex-col gap-5 rounded-2xl border border-accent-red/25 bg-accent-red/5 p-6">
            <p className="text-base leading-relaxed text-text-secondary">
              Delete all workout history? This cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleClearAll} className="rounded-xl bg-accent-red py-4 text-base font-semibold text-white">
                Delete
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-xl border border-border bg-bg-input py-4 text-base text-text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full rounded-xl border border-border-card bg-bg-card px-6 py-4 text-base text-text-muted"
          >
            Clear All Data
          </button>
        )}
      </section>
    </PageLayout>
  );
}
