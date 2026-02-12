import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getProgram } from "../data/programs";

const fullDayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function Home() {
  const navigate = useNavigate();

  const program = getProgram('heavy-duty-complete')!;
  const todayDow = new Date().getDay();

  const liftDays = program.days
    .filter((d) => d.type === "lift")
    .sort((a, b) => ((a.dayOfWeek - todayDow + 7) % 7) - ((b.dayOfWeek - todayDow + 7) % 7));

  const todayWorkout = liftDays.find((d) => d.dayOfWeek === todayDow);
  const otherDays = liftDays.filter((d) => d.dayOfWeek !== todayDow);

  return (
    <PageLayout className="flex flex-col gap-6">
      <header className="flex items-center gap-3 pt-1">
        <span className="font-[var(--font-display)] text-[2rem] tracking-wider text-accent-red">H</span>
        <h1 className="font-[var(--font-display)] text-2xl tracking-widest text-text-primary">HEAVY DUTY</h1>
      </header>

      {todayWorkout && (
        <button
          onClick={() => navigate(`/workout/${todayWorkout.id}`)}
          className="group relative flex flex-col justify-end overflow-hidden rounded-xl bg-bg-card p-0 text-left"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-accent-red/20 via-transparent to-black/90" />
          <div className="relative flex flex-col gap-5 p-6 pt-28">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-widest text-accent-red uppercase">Today's Workout</span>
              <h2 className="font-[var(--font-display)] text-5xl tracking-wide text-text-primary">{todayWorkout.focus}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded bg-accent-red px-5 py-2.5 text-sm font-semibold text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Start
              </span>
              <span className="text-sm text-text-muted">{fullDayLabels[todayWorkout.dayOfWeek]}</span>
            </div>
          </div>
        </button>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="px-0.5 text-sm font-semibold tracking-wide text-text-secondary">Upcoming</h3>
        <div className="flex flex-col gap-2">
          {otherDays.map((day) => (
            <button
              key={day.id}
              onClick={() => navigate(`/workout/${day.id}`)}
              className="flex items-center gap-4 rounded-lg bg-bg-card px-5 py-4 text-left transition-colors active:bg-bg-card-hover"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-bg-input">
                <span className="font-[var(--font-display)] text-lg text-text-muted">{fullDayLabels[day.dayOfWeek].slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <h2 className="font-[var(--font-display)] text-xl tracking-wide text-text-primary">{day.focus}</h2>
                <p className="text-xs text-text-muted">{fullDayLabels[day.dayOfWeek]}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-text-dim">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
