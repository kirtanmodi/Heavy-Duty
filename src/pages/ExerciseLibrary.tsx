import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { exerciseGroups, getExercisesByGroup } from '../data/exercises'

export function ExerciseLibrary() {
  const navigate = useNavigate()

  return (
    <PageLayout>
      <div className="pt-8 pb-5">
        <h1 className="font-[var(--font-display)] text-2xl font-bold uppercase tracking-[2px] text-text-primary">
          Exercise Library
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          All exercises organized by muscle group
        </p>
      </div>

      {exerciseGroups.map((group, groupIndex) => {
        const exercises = getExercisesByGroup(group.label)
        if (exercises.length === 0) return null
        return (
          <div key={group.label} className={groupIndex === 0 ? 'mt-8' : 'mt-10'}>
            <h2 className="mb-3 font-[var(--font-display)] text-sm font-semibold uppercase tracking-wider text-text-muted">
              {group.label}
            </h2>
            <div className="flex flex-col gap-1">
              {exercises.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => navigate(`/exercise/${ex.id}`)}
                  className="flex w-full items-center gap-3 px-5 py-5 text-left transition-colors active:bg-bg-input"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">{ex.name}</div>
                    <div className="mt-0.5 text-xs text-text-dim">{ex.equipment} · {ex.repRange[0]}-{ex.repRange[1]} reps</div>
                  </div>
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
