import { useMemo } from 'react'
import type { Exercise } from '../types'
import { useWorkoutStore, getDaysSinceExercise, getRecentSessionSets } from '../store/workoutStore'
import { getOverloadSuggestion } from '../lib/overload'

export function useOverload(exercise: Exercise) {
  const history = useWorkoutStore(s => s.history)

  return useMemo(() => {
    const [lastSets = null, ...olderSessions] = getRecentSessionSets(exercise.id, history)
    return getOverloadSuggestion(exercise, lastSets, olderSessions, getDaysSinceExercise(exercise.id, history))
  }, [exercise, history])
}
