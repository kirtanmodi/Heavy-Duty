import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getProgram } from "../data/programs";

const typeIcon: Record<string, string> = { lift: "L", cardio: "C", recovery: "R", rest: "—" };

export function Home() {
  const navigate = useNavigate();
  const program = getProgram('heavy-duty-complete')!;

  return (
    <PageLayout className="flex flex-col gap-6">
      <header className="flex items-center gap-3 pt-1">
        <span className="font-[var(--font-display)] text-[2.25rem] tracking-wider text-accent-red">H</span>
        <h1 className="font-[var(--font-display)] text-2xl tracking-widest text-text-primary">HEAVY DUTY</h1>
      </header>

      <section className="flex flex-col gap-2">
        <h3 className="px-0.5 text-sm font-semibold tracking-wide text-text-secondary">Weekly Plan</h3>
        <div className="flex flex-col gap-2">
          {program.days.map((day, index) => (
            <button
              key={day.id}
              onClick={() => navigate(`/workout/${day.id}`)}
              className="flex items-center gap-4 rounded-[14px] bg-bg-card card-surface px-5 py-4 text-left transition-colors active:bg-bg-card-hover animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border-card bg-bg-input">
                <span className="font-[var(--font-display)] text-lg text-text-muted">{typeIcon[day.type] ?? "?"}</span>
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <h2 className="font-[var(--font-display)] text-xl tracking-wide text-text-primary">{day.focus}</h2>
                {day.duration && <p className="text-xs text-text-muted">{day.duration}</p>}
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
