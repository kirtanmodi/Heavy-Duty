import type { WorkoutEntry } from '../types'

export function calcStats(workout: WorkoutEntry) {
  let totalSets = 0
  let totalVolume = 0
  let totalExercises = 0
  for (const ex of workout.exercises) {
    if (ex.skipped) continue
    totalExercises++
    totalSets += ex.sets.length
    for (const s of ex.sets) totalVolume += s.weight * s.reps
  }
  return { totalExercises, totalSets, totalVolume }
}

export function findPrevSession(workout: WorkoutEntry, history: WorkoutEntry[]): WorkoutEntry | null {
  const idx = history.findIndex(w => w.id === workout.id)
  for (let i = idx + 1; i < history.length; i++) {
    if (history[i].dayId === workout.dayId) return history[i]
  }
  return null
}

export function calcProgress(current: WorkoutEntry, prev: WorkoutEntry | null) {
  if (!prev) return null
  const curVol = calcStats(current).totalVolume
  const prevVol = calcStats(prev).totalVolume
  if (prevVol === 0) return null
  const delta = curVol - prevVol
  const pct = (delta / prevVol) * 100
  return {
    volumeDelta: delta,
    volumePercent: pct,
    type: delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'same',
  } as const
}
