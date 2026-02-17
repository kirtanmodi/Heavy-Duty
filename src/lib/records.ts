import type { SetEntry, WorkoutEntry } from '../types'

export interface PRCheck {
  isWeightPR: boolean
  isRepsPR: boolean
  isVolumePR: boolean
  previousBest: { weight: number; reps: number; volume: number }
}

export function checkPR(exerciseId: string, currentSet: SetEntry, history: WorkoutEntry[]): PRCheck {
  let maxWeight = 0
  let maxReps = 0
  let maxVolume = 0

  for (const w of history) {
    const ex = w.exercises.find(e => e.id === exerciseId)
    if (!ex) continue
    for (const s of ex.sets) {
      if (s.weight > maxWeight) maxWeight = s.weight
      if (s.reps > maxReps) maxReps = s.reps
      const vol = s.weight * s.reps
      if (vol > maxVolume) maxVolume = vol
    }
  }

  const currentVolume = currentSet.weight * currentSet.reps

  return {
    isWeightPR: currentSet.weight > maxWeight && maxWeight > 0,
    isRepsPR: currentSet.reps > maxReps && maxReps > 0,
    isVolumePR: currentVolume > maxVolume && maxVolume > 0,
    previousBest: { weight: maxWeight, reps: maxReps, volume: maxVolume },
  }
}

export function hasPR(pr: PRCheck): boolean {
  return pr.isWeightPR || pr.isRepsPR || pr.isVolumePR
}

export function getPRLabel(pr: PRCheck): string {
  if (pr.isWeightPR) return 'Weight PR!'
  if (pr.isVolumePR) return 'Volume PR!'
  if (pr.isRepsPR) return 'Reps PR!'
  return ''
}
