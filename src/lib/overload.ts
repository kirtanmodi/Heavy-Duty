import type { Exercise, SetEntry, OverloadSuggestion } from '../types'

/** Extract working sets (to-failure) from last session, falling back to the last set */
function getWorkingSets(lastSets: SetEntry[]): SetEntry[] {
  const failureSets = lastSets.filter(s => s.toFailure)
  return failureSets.length > 0 ? failureSets : [lastSets[lastSets.length - 1]]
}

/** Create Mentzer-style sets: Set 1 = warm-up at 50% weight, Set 2 = working set to failure */
export function createMentzerSets(suggestion: OverloadSuggestion, exercise: Exercise): SetEntry[] {
  const workingWeight = suggestion.suggestedWeight ?? 0
  const isBodyweightOnly = exercise.equipment === 'bodyweight+' && workingWeight === 0

  const warmupWeight = isBodyweightOnly || workingWeight === 0
    ? 0
    : Math.round((workingWeight * 0.5) / exercise.weightIncrement) * exercise.weightIncrement

  const warmupReps = isBodyweightOnly
    ? Math.max(1, Math.ceil(suggestion.suggestedReps / 2))
    : suggestion.suggestedReps

  return [
    { weight: warmupWeight, reps: warmupReps, toFailure: false, tempo: "4-1-4" },
    { weight: workingWeight, reps: suggestion.suggestedReps, toFailure: true, tempo: "4-1-4" },
  ]
}

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

  // Focus on working sets (to-failure) for progression decisions
  const workingSets = getWorkingSets(lastSets)
  const lastWeight = workingSets[0].weight
  const lastRepsStr = lastSets.map((s, i) => `Set ${i + 1}: ${s.reps}`).join(', ')
  const allHitTop = workingSets.every(s => s.reps >= repMax)
  const anyBelowBottom = workingSets.some(s => s.reps < repMin)
  const lastMaxReps = Math.max(...workingSets.map(s => s.reps))

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
  const exceededRange = lastMaxReps > repMax

  if (isBodyweightOnly) {
    return {
      message: exceededRange
        ? `Last session — ${lastRepsStr}. Reps were inconsistent (${lastMaxReps} high, others below ${repMax}). Aim for ${repMax} reps consistently across all sets.`
        : `Last session — ${lastRepsStr}. Best was ${lastMaxReps} reps. Aim for ${targetReps} reps — one more than last time.`,
      suggestedWeight: 0,
      suggestedReps: targetReps,
      type: 'maintain',
    }
  }

  return {
    message: exceededRange
      ? `Last session @ ${lastWeight}kg — ${lastRepsStr}. Reps were inconsistent (${lastMaxReps} high, others below ${repMax}). Same weight, aim for ${repMax} reps consistently across all sets.`
      : `Last session @ ${lastWeight}kg — ${lastRepsStr}. Best was ${lastMaxReps} reps (within ${repMin}–${repMax} range). Same weight, aim for ${targetReps} reps — one more than last time.`,
    suggestedWeight: lastWeight,
    suggestedReps: targetReps,
    type: 'maintain',
  }
}
