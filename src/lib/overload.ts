import type { Exercise, SetEntry, OverloadSuggestion } from '../types'

export function getOverloadSuggestion(
  exercise: Exercise,
  lastSets: SetEntry[] | null,
): OverloadSuggestion {
  const [repMin, repMax] = exercise.repRange

  if (!lastSets || lastSets.length === 0) {
    return {
      message: 'Testing week! Pick a weight you think you can do 10 times.',
      suggestedWeight: null,
      suggestedReps: repMin,
      type: 'testing',
    }
  }

  const lastWeight = lastSets[0].weight
  const allHitTop = lastSets.every(s => s.reps >= repMax)
  const anyBelowBottom = lastSets.some(s => s.reps < repMin)
  const lastMaxReps = Math.max(...lastSets.map(s => s.reps))

  if (allHitTop) {
    const increment = exercise.weightIncrement
    const newWeight = lastWeight + increment
    return {
      message: `Increase weight to ${newWeight}kg — you crushed all sets!`,
      suggestedWeight: newWeight,
      suggestedReps: repMin,
      type: 'increase',
    }
  }

  if (anyBelowBottom) {
    const dropWeight = Math.max(0, lastWeight - exercise.weightIncrement)
    return {
      message: `Weight may be too heavy. Consider dropping to ${dropWeight}kg and building back up.`,
      suggestedWeight: dropWeight,
      suggestedReps: repMin,
      type: 'decrease',
    }
  }

  const targetReps = Math.min(lastMaxReps + 1, repMax)
  return {
    message: `Same weight ${lastWeight}kg — aim for ${targetReps} reps (last: ${lastMaxReps})`,
    suggestedWeight: lastWeight,
    suggestedReps: targetReps,
    type: 'maintain',
  }
}
