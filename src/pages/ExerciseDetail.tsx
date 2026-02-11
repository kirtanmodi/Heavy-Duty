import { useParams, useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { getExercise, muscleColors, muscleGroupLabels } from '../data/exercises'
import { MuscleMap } from '../components/anatomy/MuscleMap'
import { useOverload } from '../hooks/useOverload'
import { useWorkoutStore, getExerciseHistory } from '../store/workoutStore'

const overloadColors: Record<string, string> = {
  testing: 'border-accent-blue/30 bg-accent-blue/5 text-accent-blue',
  increase: 'border-accent-green/30 bg-accent-green/5 text-accent-green',
  maintain: 'border-accent-yellow/30 bg-accent-yellow/5 text-accent-yellow',
  decrease: 'border-accent-red/30 bg-accent-red/5 text-accent-red',
}

export function ExerciseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const exercise = id ? getExercise(id) : undefined
  const history = useWorkoutStore(s => s.history)

  if (!exercise) {
    return (
      <PageLayout>
        <div className="pt-20 text-center text-text-muted">Exercise not found</div>
      </PageLayout>
    )
  }

  const suggestion = useOverload(exercise)
  const exerciseHistory = getExerciseHistory(exercise.id, history)

  const pairedExercise = exercise.supersetWith ? getExercise(exercise.supersetWith) : null

  return (
    <PageLayout>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mt-6 mb-3 flex items-center gap-1 py-2 text-sm text-text-muted active:text-text-primary"
      >
        ‹ Back
      </button>

      {/* Header */}
      <div className="mb-4">
        <h1 className="font-[var(--font-display)] text-2xl font-bold uppercase tracking-[2px] text-text-primary">
          {exercise.name}
        </h1>
        <div className="mt-1 flex items-center gap-2 text-xs text-text-dim">
          <span className="capitalize">{exercise.equipment}</span>
          <span>•</span>
          <span className="capitalize">{exercise.type}</span>
        </div>
      </div>

      {/* Muscle Diagram */}
      <div className="mb-4 flex justify-center">
        <MuscleMap
          primaryMuscles={exercise.primaryMuscles}
          secondaryMuscles={exercise.secondaryMuscles}
          size="large"
        />
      </div>

      {/* Muscle Tags */}
      <div className="mb-5 flex flex-wrap gap-2">
        {exercise.primaryMuscles.map(m => (
          <span
            key={m}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: `${muscleColors[m]}20`, color: muscleColors[m] }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: muscleColors[m] }} />
            {muscleGroupLabels[m] || m}
          </span>
        ))}
        {exercise.secondaryMuscles.map(m => (
          <span
            key={m}
            className="flex items-center gap-1.5 rounded-full border border-border bg-bg-input px-3 py-1 text-xs text-text-dim"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: muscleColors[m], opacity: 0.5 }} />
            {muscleGroupLabels[m] || m}
          </span>
        ))}
      </div>

      {/* Superset indicator */}
      {pairedExercise && (
        <div className="mb-4 rounded-[14px] border border-accent-yellow/20 bg-accent-yellow/5 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-yellow">
            ⚡ Superset
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Paired with <strong className="text-text-primary">{pairedExercise.name}</strong> — no rest between exercises
          </p>
        </div>
      )}

      {/* Mentzer Protocol */}
      <div className="mb-4 rounded-[14px] border border-border-card bg-bg-card p-4">
        <h3 className="mb-3 font-[var(--font-display)] text-sm font-semibold uppercase tracking-wider text-accent-red">
          Mentzer Protocol
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim">Tempo</div>
            <div className="mt-0.5 font-[var(--font-display)] text-lg font-bold text-accent-yellow">4-1-4</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim">Sets</div>
            <div className="mt-0.5 font-[var(--font-display)] text-lg font-bold text-text-primary">2</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim">Rep Range</div>
            <div className="mt-0.5 font-[var(--font-display)] text-lg font-bold text-text-primary">
              {exercise.repRange[0]}-{exercise.repRange[1]}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-dim">Rest</div>
            <div className="mt-0.5 font-[var(--font-display)] text-lg font-bold text-text-primary">
              {exercise.restSeconds === 0 ? 'No rest (SS)' : `${exercise.restSeconds}s`}
            </div>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-text-secondary">{exercise.mentzerTips}</p>
      </div>

      {/* Progressive Overload */}
      <div className={`mb-4 rounded-[14px] border px-4 py-3 ${overloadColors[suggestion.type]}`}>
        <div className="text-xs font-semibold uppercase tracking-wider">
          Progressive Overload
        </div>
        <p className="mt-1 text-sm">{suggestion.message}</p>
      </div>

      {/* History */}
      <div className="mb-4">
        <h3 className="mb-2 font-[var(--font-display)] text-sm font-semibold uppercase tracking-wider text-text-muted">
          History
        </h3>
        {exerciseHistory.length === 0 ? (
          <div className="rounded-[14px] border border-border-card bg-bg-card p-4 text-center text-sm text-text-dim">
            No previous sessions logged
          </div>
        ) : (
          <div className="space-y-2">
            {exerciseHistory.map(workout => {
              const exEntry = workout.exercises.find(e => e.id === exercise.id)
              if (!exEntry) return null
              return (
                <div key={workout.id} className="rounded-[14px] border border-border-card bg-bg-card px-4 py-3">
                  <div className="text-xs text-text-dim">
                    {new Date(workout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {exEntry.sets.map((set, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-border bg-bg-input px-2.5 py-1 text-xs text-text-secondary"
                      >
                        {set.weight}kg × {set.reps} {set.toFailure ? '💀' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
