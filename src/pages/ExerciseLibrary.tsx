import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { exerciseGroups, getExercisesByGroup, muscleColors } from '../data/exercises'

export function ExerciseLibrary() {
  const navigate = useNavigate()

  return (
    <PageLayout>
      <div className="pt-6 pb-4">
        <h1 className="font-[var(--font-display)] text-2xl font-bold uppercase tracking-[2px] text-text-primary">
          Exercise Library
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          All exercises organized by muscle group
        </p>
      </div>

      {exerciseGroups.map(group => {
        const exercises = getExercisesByGroup(group.label)
        if (exercises.length === 0) return null
        return (
          <div key={group.label} className="mb-6">
            <h2 className="mb-2 font-[var(--font-display)] text-sm font-semibold uppercase tracking-wider text-text-muted">
              {group.label}
            </h2>
            <div className="rounded-[14px] border border-border-card bg-bg-card overflow-hidden">
              {exercises.map((ex, i) => (
                <button
                  key={ex.id}
                  onClick={() => navigate(`/exercise/${ex.id}`)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-bg-input ${
                    i > 0 ? 'border-t border-border-card' : ''
                  }`}
                >
                  <div className="flex gap-1">
                    {ex.primaryMuscles.slice(0, 2).map(m => (
                      <span
                        key={m}
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: muscleColors[m] }}
                      />
                    ))}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">{ex.name}</div>
                    <div className="mt-0.5 text-xs text-text-dim">{ex.equipment} • {ex.repRange[0]}-{ex.repRange[1]} reps</div>
                  </div>
                  {ex.supersetWith && (
                    <span className="rounded-full bg-accent-yellow/10 px-2 py-0.5 text-[10px] font-semibold text-accent-yellow">
                      SS
                    </span>
                  )}
                  <span className="text-text-dim">›</span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </PageLayout>
  )
}
