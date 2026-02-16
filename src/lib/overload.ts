import type { Exercise, SetEntry, OverloadSuggestion } from '../types'

export function getOverloadSuggestion(
  exercise: Exercise,
  lastSets: SetEntry[] | null,
): OverloadSuggestion {
  const [repMin, repMax] = exercise.repRange
  const isBodyweight = exercise.equipment === 'bodyweight+'

  if (!lastSets || lastSets.length === 0) {
    return {
      message: isBodyweight
        ? `First time. Aim for ${repMin}–${repMax} reps with controlled form.`
        : `First time doing this exercise. Pick a weight you can handle for ${repMin}–${repMax} reps with good form.`,
      suggestedWeight: null,
      suggestedReps: repMin,
      type: 'testing',
    }
  }

  const lastWeight = lastSets[0].weight
  const lastRepsStr = lastSets.map((s, i) => `Set ${i + 1}: ${s.reps}`).join(', ')
  const allHitTop = lastSets.every(s => s.reps >= repMax)
  const anyBelowBottom = lastSets.some(s => s.reps < repMin)
  const lastMaxReps = Math.max(...lastSets.map(s => s.reps))

  const isBodyweightOnly = isBodyweight && lastWeight === 0

  if (allHitTop) {
    if (isBodyweightOnly) {
      return {
        message: `Last session — ${lastRepsStr}. All sets hit ${repMax}+ reps. Bodyweight mastered — consider adding weight, or maintain for endurance.`,
        suggestedWeight: 0,
        suggestedReps: repMax,
        type: 'increase',
      }
    }
    const increment = exercise.weightIncrement
    const newWeight = lastWeight + increment
    return {
      message: `Last session @ ${lastWeight}kg — ${lastRepsStr}. All sets hit ${repMax}+ reps (top of ${repMin}–${repMax} range), so adding ${increment}kg. Start at ${repMin} reps and build back up.`,
      suggestedWeight: newWeight,
      suggestedReps: repMin,
      type: 'increase',
    }
  }

  if (anyBelowBottom) {
    if (isBodyweightOnly) {
      return {
        message: `Last session — ${lastRepsStr}. Some sets fell below ${repMin} reps. Focus on form and hit ${repMin} reps consistently.`,
        suggestedWeight: 0,
        suggestedReps: repMin,
        type: 'decrease',
      }
    }
    const dropWeight = Math.max(0, lastWeight - exercise.weightIncrement)
    return {
      message: `Last session @ ${lastWeight}kg — ${lastRepsStr}. Some sets fell below ${repMin} reps (bottom of ${repMin}–${repMax} range). Dropping to ${dropWeight}kg to rebuild with proper form.`,
      suggestedWeight: dropWeight,
      suggestedReps: repMin,
      type: 'decrease',
    }
  }

  const targetReps = Math.min(lastMaxReps + 1, repMax)
  if (isBodyweightOnly) {
    return {
      message: `Last session — ${lastRepsStr}. Best was ${lastMaxReps} reps. Aim for ${targetReps} reps — one more than last time.`,
      suggestedWeight: 0,
      suggestedReps: targetReps,
      type: 'maintain',
    }
  }

  return {
    message: `Last session @ ${lastWeight}kg — ${lastRepsStr}. Best was ${lastMaxReps} reps (within ${repMin}–${repMax} range). Same weight, aim for ${targetReps} reps — one more than last time.`,
    suggestedWeight: lastWeight,
    suggestedReps: targetReps,
    type: 'maintain',
  }
}
