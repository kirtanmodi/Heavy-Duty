import { useMemo } from 'react'
import type { Exercise } from '../types'
import { useWorkoutStore, getLastSets } from '../store/workoutStore'
import { getOverloadSuggestion } from '../lib/overload'

export function useOverload(exercise: Exercise) {
  const history = useWorkoutStore(s => s.history)

  return useMemo(() => {
    const lastSets = getLastSets(exercise.id, history)
    return getOverloadSuggestion(exercise, lastSets)
  }, [exercise, history])
}
