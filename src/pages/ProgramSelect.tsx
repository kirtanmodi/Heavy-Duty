import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { useSettingsStore } from '../store/settingsStore'
import { programs } from '../data/programs'
import type { ProgramId } from '../types'

export function ProgramSelect() {
  const navigate = useNavigate()
  const setActiveProgram = useSettingsStore(s => s.setActiveProgram)

  const handleSelect = (id: ProgramId) => {
    setActiveProgram(id)
    navigate('/')
  }

  return (
    <PageLayout>
      <div className="pt-12 pb-8 text-center">
        <h1 className="font-[var(--font-display)] text-4xl font-bold uppercase tracking-[4px] text-text-primary">
          Heavy Duty
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Choose your training program
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {programs.map(program => (
          <button
            key={program.id}
            onClick={() => handleSelect(program.id as ProgramId)}
            className="group relative rounded-[14px] border border-border-card bg-bg-card p-5 text-left transition-all active:scale-[0.98]"
          >
            {program.recommended && (
              <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-accent-red to-accent-orange px-3 py-0.5 font-[var(--font-display)] text-[10px] font-semibold uppercase tracking-wider text-white">
                Recommended
              </span>
            )}
            <div className="flex items-baseline gap-2">
              <span className="font-[var(--font-display)] text-xs font-semibold uppercase tracking-wider text-accent-red">
                {program.shortName}
              </span>
              <span className="text-text-dim">—</span>
              <h2 className="font-[var(--font-display)] text-lg font-semibold uppercase tracking-wide text-text-primary">
                {program.name}
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {program.description}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {program.days.filter(d => d.type === 'lift').map(day => (
                <span
                  key={day.id}
                  className="rounded-full border border-border bg-bg-input px-3 py-1 text-xs text-text-muted"
                >
                  {day.focus}
                </span>
              ))}
            </div>
            <div className="mt-3 text-xs text-text-dim">
              {program.days.filter(d => d.type === 'lift').length} training days
              {program.days.some(d => d.supersets.length > 0) && ' • Supersets'}
            </div>
          </button>
        ))}
      </div>
    </PageLayout>
  )
}
