import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageLayout } from '../components/layout/PageLayout'
import { useWorkoutStore, getLastSets } from '../store/workoutStore'
import { useTimer } from '../hooks/useTimer'
import { programs } from '../data/programs'
import { getExercise, muscleColors } from '../data/exercises'
import { getOverloadSuggestion } from '../lib/overload'
import type { ExerciseEntry, SetEntry } from '../types'

export function Workout() {
  const { dayId } = useParams<{ dayId: string }>()
  const navigate = useNavigate()
  const { activeWorkout, startWorkout, updateExercise, finishWorkout, cancelWorkout, history } = useWorkoutStore()
  const timer = useTimer()
  const [showCancel, setShowCancel] = useState(false)
  const [restPresets] = useState([60, 90, 120, 180, 300])

  const day = useMemo(() => {
    for (const p of programs) {
      const found = p.days.find(d => d.id === dayId)
      if (found) return { day: found, program: p }
    }
    return null
  }, [dayId])

  useEffect(() => {
    if (!day || activeWorkout) return

    const exercises: ExerciseEntry[] = day.day.exercises.map(exId => {
      const ex = getExercise(exId)
      if (!ex) return { id: exId, name: exId, sets: [] }

      const lastSets = getLastSets(exId, history)
      const suggestion = getOverloadSuggestion(ex, lastSets)

      const sets: SetEntry[] = Array.from({ length: 2 }, () => ({
        weight: suggestion.suggestedWeight ?? 0,
        reps: suggestion.suggestedReps,
        toFailure: false,
        tempo: '4-1-4',
      }))

      return { id: exId, name: ex.name, sets }
    })

    startWorkout(day.day.id, day.day.name, day.program.name, exercises)
  }, [day, activeWorkout, history, startWorkout])

  if (!day || !activeWorkout) {
    return (
      <PageLayout>
        <div className="pt-20 text-center text-text-muted">Loading workout...</div>
      </PageLayout>
    )
  }

  const supersetMap = new Map<string, string>()
  day.day.supersets.forEach(([a, b]) => {
    supersetMap.set(a, b)
    supersetMap.set(b, a)
  })

  const isFirstInSuperset = (exId: string) => day.day.supersets.some(s => s[0] === exId)
  const isSecondInSuperset = (exId: string) => day.day.supersets.some(s => s[1] === exId)

  const handleSetChange = (exIndex: number, setIndex: number, field: keyof SetEntry, value: number | boolean) => {
    const ex = { ...activeWorkout.exercises[exIndex] }
    const sets = [...ex.sets]
    sets[setIndex] = { ...sets[setIndex], [field]: value }
    updateExercise(exIndex, { ...ex, sets })
  }

  const handleAddSet = (exIndex: number) => {
    const ex = { ...activeWorkout.exercises[exIndex] }
    const lastSet = ex.sets[ex.sets.length - 1]
    updateExercise(exIndex, {
      ...ex,
      sets: [...ex.sets, { weight: lastSet?.weight ?? 0, reps: lastSet?.reps ?? 0, toFailure: false, tempo: '4-1-4' }],
    })
  }

  const handleRemoveSet = (exIndex: number, setIndex: number) => {
    const ex = { ...activeWorkout.exercises[exIndex] }
    if (ex.sets.length <= 1) return
    updateExercise(exIndex, { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) })
  }

  const handleFinish = () => {
    finishWorkout()
    navigate('/')
  }

  const handleCancel = () => {
    cancelWorkout()
    navigate('/')
  }

  const handleRest = (exerciseId: string) => {
    const ex = getExercise(exerciseId)
    if (!ex) return
    const seconds = ex.restSeconds || 120
    const isSS = isSecondInSuperset(exerciseId)
    timer.start(seconds, isSS ? 'REST AFTER SUPERSET' : 'REST BETWEEN EXERCISES')
  }

  return (
    <div className="min-h-dvh bg-bg-primary">
      {/* Rest Timer Overlay */}
      {timer.isRunning && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary/95 backdrop-blur">
          <div className="text-sm uppercase tracking-wider text-accent-yellow">{timer.label}</div>
          <div className="mt-4 font-[var(--font-display)] text-7xl font-bold text-text-primary">
            {timer.formatTime(timer.secondsLeft)}
          </div>
          <div className="mt-6 flex gap-3">
            {restPresets.map(s => (
              <button
                key={s}
                onClick={() => timer.start(s, timer.label)}
                className="rounded-lg border border-border bg-bg-input px-3 py-2 text-xs text-text-muted active:bg-bg-card"
              >
                {s >= 60 ? `${s / 60}m` : `${s}s`}
              </button>
            ))}
          </div>
          <button
            onClick={timer.stop}
            className="mt-8 rounded-xl border border-border bg-bg-card px-8 py-3 font-[var(--font-display)] text-sm font-semibold uppercase tracking-wider text-text-muted active:bg-bg-input"
          >
            Skip
          </button>
        </div>
      )}

      <PageLayout>
        {/* Header */}
        <div className="flex items-center justify-between pt-6 pb-3">
          <div>
            <h1 className="font-[var(--font-display)] text-lg font-bold uppercase tracking-wider text-text-primary">
              {day.day.focus}
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-accent-red">
              2 sets to failure • slow reps
            </p>
          </div>
          <button
            onClick={() => setShowCancel(true)}
            className="rounded-lg border border-border px-4 py-2 text-xs text-text-muted active:bg-bg-input"
          >
            Cancel
          </button>
        </div>

        {showCancel && (
          <div className="mb-4 rounded-[14px] border border-accent-red/30 bg-accent-red/5 p-5">
            <p className="mb-3 text-sm text-text-secondary">Cancel this workout? All logged sets will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-xl bg-accent-red py-3.5 text-sm font-semibold text-white"
              >
                Yes, cancel
              </button>
              <button
                onClick={() => setShowCancel(false)}
                className="flex-1 rounded-xl border border-border py-3.5 text-sm text-text-muted"
              >
                Keep going
              </button>
            </div>
          </div>
        )}

        {/* Exercise Cards */}
        {activeWorkout.exercises.map((entry, exIndex) => {
          const exercise = getExercise(entry.id)
          if (!exercise) return null

          const firstInSS = isFirstInSuperset(entry.id)
          const secondInSS = isSecondInSuperset(entry.id)
          const lastSets = getLastSets(entry.id, history)
          const suggestion = getOverloadSuggestion(exercise, lastSets)

          return (
            <div key={entry.id}>
              {/* Superset header */}
              {firstInSS && (
                <div className="mb-1 mt-4 flex items-center gap-2">
                  <span className="rounded-full bg-accent-yellow/10 px-2.5 py-0.5 font-[var(--font-display)] text-[10px] font-semibold uppercase tracking-wider text-accent-yellow">
                    Superset
                  </span>
                  <div className="h-px flex-1 bg-accent-yellow/20" />
                </div>
              )}

              {/* No rest indicator between superset exercises */}
              {secondInSS && (
                <div className="flex items-center justify-center gap-2 py-1">
                  <div className="h-px w-8 bg-accent-yellow/30" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-yellow">No Rest</span>
                  <div className="h-px w-8 bg-accent-yellow/30" />
                </div>
              )}

              <div className={`mb-3 rounded-[14px] border bg-bg-card p-5 ${
                firstInSS || secondInSS ? 'border-accent-yellow/20' : 'border-border-card'
              }`}>
                {/* Exercise header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-1">
                    {exercise.primaryMuscles.slice(0, 2).map(m => (
                      <span key={m} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: muscleColors[m] }} />
                    ))}
                  </div>
                  <button
                    onClick={() => navigate(`/exercise/${entry.id}`)}
                    className="flex-1 text-left"
                  >
                    <span className="text-sm font-medium text-text-primary">{entry.name}</span>
                    <span className="ml-2 text-xs text-text-dim">{exercise.equipment}</span>
                  </button>
                </div>

                {/* Overload suggestion */}
                <div className={`mb-3 rounded-lg px-3 py-2 text-xs ${
                  suggestion.type === 'increase' ? 'bg-accent-green/10 text-accent-green' :
                  suggestion.type === 'decrease' ? 'bg-accent-red/10 text-accent-red' :
                  suggestion.type === 'testing' ? 'bg-accent-blue/10 text-accent-blue' :
                  'bg-accent-yellow/10 text-accent-yellow'
                }`}>
                  {suggestion.message}
                </div>

                {/* Set rows */}
                <div className="space-y-2">
                  <div className="grid grid-cols-[32px_1fr_1fr_44px_32px] gap-2 text-[10px] uppercase tracking-wider text-text-dim">
                    <span>Set</span>
                    <span>KG</span>
                    <span>Reps</span>
                    <span className="text-center">Fail</span>
                    <span />
                  </div>
                  {entry.sets.map((set, setIndex) => (
                    <div key={setIndex} className="grid grid-cols-[32px_1fr_1fr_44px_32px] items-center gap-2">
                      <span className="text-center text-xs font-semibold text-text-dim">{setIndex + 1}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={set.weight || ''}
                        onChange={e => handleSetChange(exIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                        className="rounded-lg border border-border bg-bg-input px-3 py-3 text-center text-sm text-text-primary outline-none focus:border-accent-red"
                        placeholder="0"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        value={set.reps || ''}
                        onChange={e => handleSetChange(exIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                        className="rounded-lg border border-border bg-bg-input px-3 py-3 text-center text-sm text-text-primary outline-none focus:border-accent-red"
                        placeholder="0"
                      />
                      <button
                        onClick={() => handleSetChange(exIndex, setIndex, 'toFailure', !set.toFailure)}
                        className={`flex h-[44px] items-center justify-center rounded-lg border text-lg transition-colors ${
                          set.toFailure
                            ? 'border-accent-red bg-accent-red/10'
                            : 'border-border bg-bg-input'
                        }`}
                      >
                        {set.toFailure ? '💀' : '○'}
                      </button>
                      <button
                        onClick={() => handleRemoveSet(exIndex, setIndex)}
                        className={`flex h-[44px] items-center justify-center rounded-lg text-text-dim transition-colors active:text-accent-red ${
                          entry.sets.length <= 1 ? 'opacity-0 pointer-events-none' : ''
                        }`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add set + Rest buttons */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAddSet(exIndex)}
                    className="flex-1 rounded-lg border border-dashed border-border py-3 text-xs text-text-dim active:border-text-muted active:text-text-muted"
                  >
                    + Add Set
                  </button>
                  {exercise.restSeconds > 0 && !firstInSS && (
                    <button
                      onClick={() => handleRest(entry.id)}
                      className="rounded-lg border border-accent-yellow/30 bg-accent-yellow/5 px-5 py-3 text-xs font-semibold text-accent-yellow active:bg-accent-yellow/10"
                    >
                      Rest {exercise.restSeconds}s
                    </button>
                  )}
                  {secondInSS && (
                    <button
                      onClick={() => timer.start(120, 'REST AFTER SUPERSET')}
                      className="rounded-lg border border-accent-yellow/30 bg-accent-yellow/5 px-5 py-3 text-xs font-semibold text-accent-yellow active:bg-accent-yellow/10"
                    >
                      Rest 2min
                    </button>
                  )}
                </div>
              </div>

              {/* Superset end divider */}
              {secondInSS && (
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-accent-yellow/20" />
                </div>
              )}
            </div>
          )
        })}

        {/* Finish */}
        <button
          onClick={handleFinish}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent-red to-accent-orange py-5 font-[var(--font-display)] text-base font-semibold uppercase tracking-[1.5px] text-white transition-all active:scale-[0.98]"
        >
          Finish Workout
        </button>
      </PageLayout>
    </div>
  )
}
