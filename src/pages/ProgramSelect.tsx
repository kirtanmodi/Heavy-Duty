import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { programs } from "../data/programs";
import { useSettingsStore } from "../store/settingsStore";
import type { ProgramId } from "../types";

export function ProgramSelect() {
  const navigate = useNavigate();
  const activeProgram = useSettingsStore((s) => s.activeProgram);
  const setActiveProgram = useSettingsStore((s) => s.setActiveProgram);

  const handleSelect = (id: ProgramId) => {
    setActiveProgram(id);
    navigate("/");
  };

  return (
    <PageLayout>
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-4 pt-2">
          <p className="text-xs text-text-muted">Setup</p>
          <h1 className="font-[var(--font-display)] text-4xl leading-none text-text-primary">Choose your plan</h1>
          <p className="max-w-[34ch] text-base leading-relaxed text-text-secondary">Start with one program. You can switch at any time.</p>
        </header>

        <div className="flex flex-col gap-5">
          {programs.map((program) => {
            const isActive = activeProgram === program.id;
            const liftDays = program.days.filter((d) => d.type === "lift").length;

            return (
              <button
                key={program.id}
                onClick={() => handleSelect(program.id as ProgramId)}
                aria-pressed={isActive}
                className={`block w-full overflow-hidden rounded-2xl border text-left transition-colors active:scale-[0.99] p-[2rem] ${
                  isActive ? "border-text-primary bg-bg-card" : "border-border-card bg-bg-card active:border-border active:bg-bg-input"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex flex-col gap-4">
                    <h2 className="font-[var(--font-display)] text-[1.95rem] leading-[1.12] text-text-primary">{program.name}</h2>
                    <p className="text-base leading-relaxed text-text-secondary">{program.description}</p>
                    <p className="text-sm text-text-muted">
                      {liftDays} lift days{program.recommended ? " · Recommended" : ""}
                    </p>
                  </div>
                  <span className="pt-1 text-base text-text-dim">{isActive ? "Selected" : "›"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
