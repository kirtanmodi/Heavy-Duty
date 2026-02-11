import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WorkoutEntry, ExerciseEntry } from '../types'

interface WorkoutState {
  history: WorkoutEntry[]
  activeWorkout: {
    dayId: string
    dayName: string
    program: string
    exercises: ExerciseEntry[]
    startedAt: string
  } | null

  startWorkout: (dayId: string, dayName: string, program: string, exercises: ExerciseEntry[]) => void
  updateExercise: (exerciseIndex: number, exercise: ExerciseEntry) => void
  finishWorkout: () => void
  cancelWorkout: () => void
  clearAll: () => void
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      history: [],
      activeWorkout: null,

      startWorkout: (dayId, dayName, program, exercises) =>
        set({
          activeWorkout: {
            dayId,
            dayName,
            program,
            exercises,
            startedAt: new Date().toISOString(),
          },
        }),

      updateExercise: (exerciseIndex, exercise) => {
        const active = get().activeWorkout
        if (!active) return
        const exercises = [...active.exercises]
        exercises[exerciseIndex] = exercise
        set({ activeWorkout: { ...active, exercises } })
      },

      finishWorkout: () => {
        const active = get().activeWorkout
        if (!active) return
        const entry: WorkoutEntry = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          program: active.program,
          day: active.dayName,
          dayId: active.dayId,
          exercises: active.exercises.filter(e => e.sets.some(s => s.weight > 0 || s.reps > 0)),
        }
        set(state => ({
          history: [entry, ...state.history],
          activeWorkout: null,
        }))
      },

      cancelWorkout: () => set({ activeWorkout: null }),

      clearAll: () => set({ history: [], activeWorkout: null }),
    }),
    { name: 'hd_workouts' }
  )
)

export function getExerciseHistory(exerciseId: string, history: WorkoutEntry[], limit = 8): WorkoutEntry[] {
  return history
    .filter(w => w.exercises.some(e => e.id === exerciseId))
    .slice(0, limit)
}

export function getLastSets(exerciseId: string, history: WorkoutEntry[]) {
  for (const workout of history) {
    const ex = workout.exercises.find(e => e.id === exerciseId)
    if (ex && ex.sets.length > 0) return ex.sets
  }
  return null
}
