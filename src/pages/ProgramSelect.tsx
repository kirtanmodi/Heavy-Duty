import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { useSettingsStore } from '../store/settingsStore'
import { programs } from '../data/programs'
import type { ProgramId } from '../types'

export function ProgramSelect() {
  const navigate = useNavigate()
  const activeProgram = useSettingsStore(s => s.activeProgram)
  const setActiveProgram = useSettingsStore(s => s.setActiveProgram)

  const handleSelect = (id: ProgramId) => {
    setActiveProgram(id)
    navigate('/')
  }

  return (
    <PageLayout>
      <div className="pt-12 pb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-bold tracking-wide text-text-primary">
          Choose Program
        </h1>
      </div>

      <div className="flex flex-col gap-6">
        {programs.map(program => {
          const isActive = activeProgram === program.id
          const liftDays = program.days.filter(d => d.type === 'lift').length
          return (
          <button
            key={program.id}
            onClick={() => handleSelect(program.id as ProgramId)}
            className={`rounded-xl p-6 text-left transition-all active:scale-[0.98] ${
              isActive
                ? 'border-l-[3px] border-accent-red bg-bg-card pl-[17px]'
                : 'bg-bg-card'
            }`}
          >
            <div className="flex items-center gap-3">
              <h2 className="font-[var(--font-display)] text-base font-semibold tracking-wide text-text-primary">
                {program.name}
              </h2>
              {isActive && (
                <span className="text-accent-red text-sm">✓</span>
              )}
              {program.recommended && (
                <span className="text-xs text-text-muted">Recommended</span>
              )}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
              {program.description}
            </p>
            <p className="mt-2 text-xs text-text-dim">
              {liftDays} training days
            </p>
          </button>
          )
        })}
      </div>
    </PageLayout>
  )
}
