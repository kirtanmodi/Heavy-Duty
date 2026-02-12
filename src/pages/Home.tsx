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

  return (
    <PageLayout className="flex flex-col gap-8">
      <header className="pt-2">
        <h1 className="font-[var(--font-display)] text-4xl leading-none text-text-primary">Heavy Duty</h1>
      </header>

      <section className="flex flex-col gap-4">
        {liftDays.map((day) => {
          const isToday = day.dayOfWeek === todayDow;

          return (
            <button
              key={day.id}
              onClick={() => navigate(`/workout/${day.id}`)}
              className={`flex items-center justify-between rounded-2xl border p-6 text-left active:scale-[0.99] ${
                isToday ? "border-accent-red/30 bg-accent-red/5" : "border-border-card bg-bg-card"
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <p className={`text-sm font-medium ${isToday ? "text-accent-red" : "text-text-muted"}`}>
                  {isToday ? "Today" : fullDayLabels[day.dayOfWeek]}
                </p>
                <h2 className="font-[var(--font-display)] text-2xl leading-tight text-text-primary">
                  {day.focus}
                </h2>
              </div>
              <span className="text-lg text-text-dim">&rsaquo;</span>
            </button>
          );
        })}
      </section>
    </PageLayout>
  );
}
