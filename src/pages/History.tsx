import { useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { useWorkoutStore } from '../store/workoutStore'

export function History() {
  const navigate = useNavigate()
  const history = useWorkoutStore(s => s.history)

  return (
    <PageLayout>
      <div className="pt-6 pb-4">
        <h1 className="font-[var(--font-display)] text-2xl font-bold uppercase tracking-[2px] text-text-primary">
          History
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          {history.length} workout{history.length !== 1 ? 's' : ''} logged
        </p>
      </div>

      {history.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="text-4xl mb-3">🏋️</div>
          <p className="text-sm text-text-muted">No workouts yet</p>
          <p className="mt-1 text-xs text-text-dim">Complete your first workout to see it here</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-xl bg-gradient-to-r from-accent-red to-accent-orange px-6 py-3 font-[var(--font-display)] text-sm font-semibold uppercase tracking-wider text-white"
          >
            Start Training
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(workout => (
            <div key={workout.id} className="rounded-[14px] border border-border-card bg-bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-[var(--font-display)] text-sm font-semibold uppercase tracking-wide text-text-primary">
                    {workout.day}
                  </h3>
                  <div className="mt-0.5 text-xs text-text-dim">
                    {new Date(workout.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <span className="rounded-full bg-bg-input px-2.5 py-0.5 text-[10px] text-text-dim">
                  {workout.program}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {workout.exercises.map(ex => (
                  <div key={ex.id}>
                    <button
                      onClick={() => navigate(`/exercise/${ex.id}`)}
                      className="text-xs font-medium text-text-secondary active:text-text-primary"
                    >
                      {ex.name}
                    </button>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {ex.sets.map((set, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-border bg-bg-input px-2.5 py-0.5 text-[11px] text-text-muted"
                        >
                          {set.weight}kg × {set.reps} {set.toFailure ? '💀' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  )
}
