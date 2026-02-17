import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { getProgram } from "../data/programs";

const typeIcon: Record<string, string> = { lift: "L", cardio: "C", recovery: "R", rest: "—" };

export function Home() {
  const navigate = useNavigate();
  const program = getProgram('heavy-duty-complete')!;
  const today = new Date().getDay(); // 0=Sun, 1=Mon...

  const sortedDays = useMemo(() => {
    return [...program.days].sort((a, b) => {
      const aDist = (a.dayOfWeek - today + 7) % 7;
      const bDist = (b.dayOfWeek - today + 7) % 7;
      return aDist - bDist;
    });
  }, [program.days, today]);

  return (
    <PageLayout className="flex flex-col gap-6">
      <header className="flex items-center gap-3 pt-1">
        <span className="font-[var(--font-display)] text-[2.25rem] tracking-wider text-accent-red">H</span>
        <h1 className="font-[var(--font-display)] text-2xl tracking-widest text-text-primary">HEAVY DUTY</h1>
      </header>

      <section className="flex flex-col gap-2">
        <h3 className="px-0.5 text-sm font-semibold tracking-wide text-text-secondary">Weekly Plan</h3>
        <div className="flex flex-col gap-2">
          {sortedDays.map((day, index) => {
            const isToday = day.dayOfWeek === today;

            return (
              <button
                key={day.id}
                onClick={() => navigate(`/workout/${day.id}`)}
                className={`flex items-center gap-4 rounded-[14px] bg-bg-card px-5 py-4 text-left transition-colors active:bg-bg-card-hover animate-fade-up ${
                  isToday ? "card-glow-red border-l-[3px] border-accent-red" : "card-surface"
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] border bg-bg-input ${
                  isToday ? "border-accent-red/30" : "border-border-card"
                }`}>
                  <span className={`font-[var(--font-display)] text-lg ${isToday ? "text-accent-red" : "text-text-muted"}`}>
                    {typeIcon[day.type] ?? "?"}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="font-[var(--font-display)] text-xl tracking-wide text-text-primary">{day.focus}</h2>
                    {isToday && (
                      <span className="rounded-full bg-accent-red/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-accent-red uppercase">
                        Today
                      </span>
                    )}
                  </div>
                  {day.duration && <p className="text-xs text-text-muted">{day.duration}</p>}
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-text-dim">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            );
          })}
        </div>
      </section>
    </PageLayout>
  );
}
