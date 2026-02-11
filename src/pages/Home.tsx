import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getExercise } from "../data/exercises";
import { getProgram } from "../data/programs";
import { useSettingsStore } from "../store/settingsStore";
import { useWorkoutStore } from "../store/workoutStore";

const fullDayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Home() {
  const navigate = useNavigate();
  const activeProgram = useSettingsStore((s) => s.activeProgram);
  const clearWorkouts = useWorkoutStore((s) => s.clearAll);
  const clearSettings = useSettingsStore((s) => s.clearAll);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const program = activeProgram ? getProgram(activeProgram) : null;

  useEffect(() => {
    if (!program) {
      navigate("/program-select", { replace: true });
    }
  }, [navigate, program]);

  const todayDow = new Date().getDay();
  const todayDay = program?.days.find((d) => d.dayOfWeek === todayDow);

  const otherLiftDays = program
    ? [...program.days]
        .filter((d) => d.type === "lift" && d.dayOfWeek !== todayDow)
        .sort((a, b) => ((a.dayOfWeek - todayDow + 7) % 7) - ((b.dayOfWeek - todayDow + 7) % 7))
    : [];

  const getExerciseCount = (exerciseIds: string[]) => exerciseIds.filter((id) => getExercise(id)).length;

  const handleClearAll = () => {
    clearWorkouts();
    clearSettings();
    setShowClearConfirm(false);
    window.location.reload();
  };

  if (!program) return null;

  return (
    <PageLayout className="flex flex-col gap-8">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-muted">Heavy Duty</p>
          <h1 className="font-[var(--font-display)] text-4xl leading-none text-text-primary">Train smarter.</h1>
        </div>
        <button
          onClick={() => navigate("/program-select")}
          className="rounded-full border border-border bg-bg-input px-4 py-2.5 text-sm text-text-secondary"
        >
          {program.shortName}
        </button>
      </header>

      <section className="rounded-2xl border border-border-card bg-bg-card p-6">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-text-muted">Today · {fullDayLabels[todayDow]}</p>

          {todayDay ? (
            <>
              <h2 className="font-[var(--font-display)] text-[2.05rem] leading-[1.12] text-text-primary">{todayDay.focus}</h2>

              {todayDay.type === "lift" && (
                <p className="text-base text-text-secondary">{getExerciseCount(todayDay.exercises)} exercises planned.</p>
              )}

              {todayDay.type !== "lift" && (
                <p className="text-base leading-relaxed text-text-secondary">
                  {[todayDay.duration, todayDay.description].filter(Boolean).join(" · ")}
                </p>
              )}

              {todayDay.tips && <p className="text-base leading-relaxed text-text-muted">{todayDay.tips}</p>}

              {todayDay.type === "lift" ? (
                <button
                  onClick={() => navigate(`/workout/${todayDay.id}`)}
                  className="w-full rounded-xl bg-accent-red py-4 text-base font-semibold text-white active:scale-[0.99]"
                >
                  Start Workout
                </button>
              ) : (
                <button
                  onClick={() => navigate("/library")}
                  className="w-full rounded-xl border border-border bg-bg-input py-4 text-base text-text-secondary"
                >
                  Browse Exercise Library
                </button>
              )}
            </>
          ) : (
            <>
              <h2 className="font-[var(--font-display)] text-[2.05rem] leading-[1.12] text-text-primary">Rest Day</h2>
              <p className="text-base text-text-secondary">No training scheduled today.</p>
            </>
          )}
        </div>
      </section>

      {otherLiftDays.length > 0 && (
        <section className="rounded-2xl border border-border-card bg-bg-card p-6">
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-medium text-text-secondary">Upcoming Lift Days</h3>
            <div className="flex flex-col gap-2.5">
            {otherLiftDays.map((day) => (
              <button
                key={day.id}
                onClick={() => navigate(`/workout/${day.id}`)}
                className="flex w-full items-center justify-between rounded-xl px-4 py-4 text-left active:bg-bg-input"
              >
                <span className="flex flex-col gap-1">
                  <span className="block text-base font-medium text-text-primary">{day.focus}</span>
                  <span className="block text-sm text-text-muted">{fullDayLabels[day.dayOfWeek]}</span>
                </span>
                <span className="text-lg text-text-dim">›</span>
              </button>
            ))}
          </div>
          </div>
        </section>
      )}

      <section>
        {showClearConfirm ? (
          <div className="flex flex-col gap-5 rounded-2xl border border-accent-red/25 bg-accent-red/5 p-6">
            <p className="text-base leading-relaxed text-text-secondary">
              Delete all workout history and settings? This cannot be undone.
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
