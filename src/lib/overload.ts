import type { Exercise, SetEntry, OverloadSuggestion } from '../types'

interface WorkingSets {
  /** Working sets that were actually performed (reps logged) */
  sets: SetEntry[]
  /** A working set was planned but left blank (reps 0) */
  unlogged: boolean
  /** Planned working weight, used when the working set was left blank */
  plannedWeight: number
}

/**
 * Extract working sets (to-failure) from a session. Blank sets (0 reps) are
 * ignored so an unlogged working set never reads as a failed one. Legacy
 * sessions without a to-failure flag fall back to the last performed set.
 */
function getWorkingSets(sets: SetEntry[]): WorkingSets {
  const planned = sets.filter(s => s.toFailure)
  if (planned.length > 0) {
    const performed = planned.filter(s => s.reps > 0)
    return { sets: performed, unlogged: performed.length === 0, plannedWeight: planned[0].weight }
  }
  const performed = sets.filter(s => s.reps > 0)
  const last = performed[performed.length - 1]
  return { sets: last ? [last] : [], unlogged: !last, plannedWeight: last?.weight ?? 0 }
}

function roundWeight(weight: number): number {
  return Number(weight.toFixed(2))
}

/** Max relative jump in one step (NSCA guidance: 2.5–10% load increases) */
const MAX_JUMP_RATIO = 0.1

/**
 * Next working weight after hitting the top of the rep range. Barely over the
 * top → one increment (classic double progression). Clearly over (2+ reps,
 * the NSCA "2-for-2" signal) → Epley-estimate the load for targetReps, rounded
 * down to the increment, capped at +10%.
 */
function getIncreasedWeight(weight: number, reps: number, repMax: number, targetReps: number, increment: number): number {
  if (reps - repMax < 2 || weight <= 0) return roundWeight(weight + increment)
  const estimated1RM = weight * (1 + reps / 30)
  const target = Math.min(estimated1RM / (1 + targetReps / 30), weight * (1 + MAX_JUMP_RATIO))
  const steps = Math.max(1, Math.floor((target - weight) / increment + 1e-9))
  return roundWeight(weight + steps * increment)
}

/** Working sets per exercise, each taken to failure at the same weight */
export const WORKING_SETS_PER_EXERCISE = 2

/** Warm-up load as a fraction of working weight (Mentzer: last warm-up ~75%) */
const WARMUP_LOAD_RATIO = 0.7

/**
 * A warm-up set is only needed when none of this exercise's primary muscles
 * were already the primary target of an earlier exercise this session. This
 * keeps Mentzer's pre-exhaust pairs back-to-back (e.g. leg extension → leg
 * press, flyes → incline press, pullover → pulldown).
 */
export function needsWarmUpSet(exercise: Exercise, earlierExercises: Exercise[]): boolean {
  return !earlierExercises.some((earlier) =>
    earlier.primaryMuscles.some((muscle) => exercise.primaryMuscles.includes(muscle)),
  )
}

/**
 * Create sets: an optional warm-up (~70% of working weight for about half the
 * target reps — specific but far from failure) followed by
 * WORKING_SETS_PER_EXERCISE working sets to failure at the same weight.
 */
export function createMentzerSets(
  suggestion: OverloadSuggestion,
  exercise: Exercise,
  options: { warmUp?: boolean } = {},
): SetEntry[] {
  const workingWeight = suggestion.suggestedWeight ?? 0
  const workingSets: SetEntry[] = Array.from({ length: WORKING_SETS_PER_EXERCISE }, () => (
    { weight: workingWeight, reps: suggestion.suggestedReps, toFailure: true, tempo: "4-1-4" }
  ))
  if (options.warmUp === false) return workingSets

  const isBodyweightOnly = exercise.equipment === 'bodyweight+' && workingWeight === 0
  const warmupWeight = isBodyweightOnly || workingWeight === 0
    ? 0
    : Math.round((workingWeight * WARMUP_LOAD_RATIO) / exercise.weightIncrement) * exercise.weightIncrement
  const warmupReps = Math.max(3, Math.ceil(suggestion.suggestedReps / 2))

  return [
    { weight: warmupWeight, reps: warmupReps, toFailure: false, tempo: "4-1-4" },
    ...workingSets,
  ]
}

export function backOffSetsByOneStep(sets: SetEntry[], exercise: Exercise): SetEntry[] {
  return sets.map((set) => ({
    ...set,
    weight: set.weight > 0
      ? Math.max(0, Number((set.weight - exercise.weightIncrement).toFixed(2)))
      : set.weight,
  }))
}

/**
 * Layoff reduction by days since the exercise was last done. Trained lifters
 * keep strength for ~3 weeks off; losses become meaningful from ~4 weeks and
 * noticeable by ~8 weeks. Normal cycle gaps (~8–16 days) never trigger this.
 */
const LAYOFF_TIERS: { minDays: number; reduction: number }[] = [
  { minDays: 42, reduction: 0.2 },
  { minDays: 21, reduction: 0.1 },
]

function applyLayoffReduction(
  suggestion: OverloadSuggestion,
  exercise: Exercise,
  daysSinceLast: number | undefined,
): OverloadSuggestion {
  if (daysSinceLast === undefined || suggestion.type === 'testing') return suggestion
  const tier = LAYOFF_TIERS.find(t => daysSinceLast >= t.minDays)
  const weight = suggestion.suggestedWeight
  if (!tier || !weight || weight <= 0) return suggestion

  const increment = exercise.weightIncrement
  const reduced = Math.floor((weight * (1 - tier.reduction)) / increment + 1e-9) * increment
  const newWeight = Math.max(0, roundWeight(Math.min(reduced, weight - increment)))
  const weeks = Math.floor(daysSinceLast / 7)
  const [repMin] = exercise.repRange
  return {
    message: `${weeks} weeks since you last did this, so easing back in at ${newWeight}kg (−${Math.round((1 - newWeight / weight) * 100)}%). Aim for ${repMin}+ reps with clean form; progression resumes from here.`,
    suggestedWeight: newWeight,
    suggestedReps: repMin,
    type: 'decrease',
  }
}

/**
 * @param lastSets      most recent session's sets for this exercise
 * @param olderSessions earlier sessions' sets, most recent first (optional —
 *                      enables "missed twice" and stall detection)
 * @param daysSinceLast days since the exercise was last done (optional —
 *                      enables the automatic layoff reduction)
 */
export function getOverloadSuggestion(
  exercise: Exercise,
  lastSets: SetEntry[] | null,
  olderSessions: SetEntry[][] = [],
  daysSinceLast?: number,
): OverloadSuggestion {
  return applyLayoffReduction(getBaseSuggestion(exercise, lastSets, olderSessions), exercise, daysSinceLast)
}

function getBaseSuggestion(
  exercise: Exercise,
  lastSets: SetEntry[] | null,
  olderSessions: SetEntry[][],
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
  const working = getWorkingSets(lastSets)

  if (working.unlogged) {
    const weight = working.plannedWeight
    if (weight <= 0 && !isBodyweight) {
      return {
        message: `Last session's working set wasn't logged. Pick a weight you can handle for ${repMin}–${repMax} reps.`,
        suggestedWeight: null,
        suggestedReps: repMin,
        type: 'testing',
      }
    }
    return {
      message: `Last session's working set wasn't logged. Repeat ${weight > 0 ? `${weight}kg` : 'bodyweight'} and aim for ${repMin}–${repMax} reps.`,
      suggestedWeight: weight,
      suggestedReps: repMin,
      type: 'maintain',
    }
  }

  // Progression keys off the first working set. Later sets to failure are
  // expected to lose 1–3 reps to fatigue and shouldn't trigger weight drops.
  const workingSets = working.sets.slice(0, 1)
  const lastWeight = workingSets[0].weight
  const lastRepsStr = lastSets.filter(s => s.reps > 0).map((s, i) => `Set ${i + 1}: ${s.reps}`).join(', ')
  const allHitTop = workingSets.every(s => s.reps >= repMax)
  const anyBelowBottom = workingSets.some(s => s.reps < repMin)
  const lastMaxReps = Math.max(...workingSets.map(s => s.reps))
  const lastMinReps = Math.min(...workingSets.map(s => s.reps))

  const isBodyweightOnly = isBodyweight && lastWeight === 0

  // Earlier sessions at the same working weight (most recent first, contiguous)
  const sameWeightHistory: SetEntry[][] = []
  for (const session of olderSessions) {
    const older = getWorkingSets(session)
    if (older.sets.length === 0 || older.sets[0].weight !== lastWeight) break
    sameWeightHistory.push(older.sets.slice(0, 1))
  }

  if (allHitTop) {
    if (isBodyweightOnly) {
      return {
        message: `Last session — ${lastRepsStr}. First working set hit ${repMax}+ reps. Bodyweight mastered — consider adding weight, or maintain for endurance.`,
        suggestedWeight: 0,
        suggestedReps: repMax,
        type: 'increase',
      }
    }
    const clearlyOver = lastMinReps - repMax >= 2 && lastWeight > 0
    const targetReps = clearlyOver ? Math.round((repMin + repMax) / 2) : repMin
    const newWeight = getIncreasedWeight(lastWeight, lastMinReps, repMax, targetReps, exercise.weightIncrement)
    const added = roundWeight(newWeight - lastWeight)
    return {
      message: clearlyOver
        ? `Last session @ ${lastWeight}kg — ${lastRepsStr}. That's ${lastMinReps - repMax} reps past the top of ${repMin}–${repMax}, so the weight was too light. Adding ${added}kg — aim for ${targetReps} reps.`
        : `Last session @ ${lastWeight}kg — ${lastRepsStr}. First working set hit ${repMax}+ reps (top of ${repMin}–${repMax} range), so adding ${added}kg. Start at ${repMin} reps and build back up.`,
      suggestedWeight: newWeight,
      suggestedReps: targetReps,
      type: 'increase',
    }
  }

  if (anyBelowBottom) {
    if (isBodyweightOnly) {
      return {
        message: `Last session — ${lastRepsStr}. First working set fell below ${repMin} reps. Focus on form and hit ${repMin} reps consistently.`,
        suggestedWeight: 0,
        suggestedReps: repMin,
        type: 'decrease',
      }
    }
    // One short session is usually day-to-day variability (sleep, food, stress),
    // not lost strength. Drop only when clearly too heavy or missed twice running.
    const shortBy = repMin - lastMinReps
    const missedBefore = sameWeightHistory.length > 0 && sameWeightHistory[0].some(s => s.reps < repMin)
    if (shortBy < 2 && !missedBefore) {
      return {
        message: `Last session @ ${lastWeight}kg — ${lastRepsStr}. ${shortBy} rep short of ${repMin} — could be an off day. Repeat ${lastWeight}kg and aim for ${repMin}. Miss again and the weight drops.`,
        suggestedWeight: lastWeight,
        suggestedReps: repMin,
        type: 'maintain',
      }
    }
    const dropWeight = Math.max(0, roundWeight(lastWeight - exercise.weightIncrement))
    const reason = missedBefore
      ? `Below ${repMin} reps two sessions in a row`
      : `First working set fell below ${repMin} reps (bottom of ${repMin}–${repMax} range)`
    return {
      message: `Last session @ ${lastWeight}kg — ${lastRepsStr}. ${reason}. Dropping to ${dropWeight}kg to rebuild with proper form.`,
      suggestedWeight: dropWeight,
      suggestedReps: repMin,
      type: 'decrease',
    }
  }

  const targetReps = Math.min(lastMaxReps + 1, repMax)

  // Stall: same weight for 3 sessions with no rep gain. Mentzer's prescription
  // is more recovery between sessions, not more sets.
  const stalled = sameWeightHistory.length >= 2
    && sameWeightHistory.slice(0, 2).every(sets => Math.max(...sets.map(s => s.reps)) >= lastMaxReps)
  const stallNote = stalled
    ? ' No rep gain in 3 sessions — add an extra rest day before this workout.'
    : ''

  if (isBodyweightOnly) {
    return {
      message: `Last session — ${lastRepsStr}. Best was ${lastMaxReps} reps. Aim for ${targetReps} reps — one more than last time.${stallNote}`,
      suggestedWeight: 0,
      suggestedReps: targetReps,
      type: 'maintain',
    }
  }

  return {
    message: `Last session @ ${lastWeight}kg — ${lastRepsStr}. Best was ${lastMaxReps} reps (within ${repMin}–${repMax} range). Same weight, aim for ${targetReps} reps — one more than last time.${stallNote}`,
    suggestedWeight: lastWeight,
    suggestedReps: targetReps,
    type: 'maintain',
  }
}
