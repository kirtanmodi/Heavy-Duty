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
    splitSupersets: string[]
  } | null
  lastCompletedWorkout: WorkoutEntry | null

  startWorkout: (dayId: string, dayName: string, program: string, exercises: ExerciseEntry[]) => void
  updateExercise: (exerciseIndex: number, exercise: ExerciseEntry) => void
  reorderExercises: (exercises: ExerciseEntry[]) => void
  splitSuperset: (firstExerciseId: string) => void
  finishWorkout: () => void
  cancelWorkout: () => void
  addExerciseToWorkout: (exercise: ExerciseEntry) => void
  insertExerciseAtIndex: (exercise: ExerciseEntry, index: number) => void
  removeExerciseFromWorkout: (exerciseIndex: number) => void
  skipExercise: (exerciseIndex: number) => void
  unskipExercise: (exerciseIndex: number) => void
  updateHistoryEntry: (workoutId: string, exercises: ExerciseEntry[]) => void
  deleteHistoryEntry: (workoutId: string) => void
  importHistory: (workouts: WorkoutEntry[]) => void
  clearAll: () => void
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      history: [],
      activeWorkout: null,
      lastCompletedWorkout: null,

      startWorkout: (dayId, dayName, program, exercises) =>
        set({
          activeWorkout: {
            dayId,
            dayName,
            program,
            exercises,
            startedAt: new Date().toISOString(),
            splitSupersets: [],
          },
        }),

      updateExercise: (exerciseIndex, exercise) => {
        const active = get().activeWorkout
        if (!active) return
        const exercises = [...active.exercises]
        exercises[exerciseIndex] = exercise
        set({ activeWorkout: { ...active, exercises } })
      },

      reorderExercises: (exercises) => {
        const active = get().activeWorkout
        if (!active) return
        set({ activeWorkout: { ...active, exercises } })
      },

      splitSuperset: (firstExerciseId) => {
        const active = get().activeWorkout
        if (!active) return
        set({
          activeWorkout: {
            ...active,
            splitSupersets: [...(active.splitSupersets ?? []), firstExerciseId],
          },
        })
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
          startedAt: active.startedAt,
          exercises: active.exercises.filter(e => e.skipped || e.sets.some(s => s.reps > 0)),
        }
        set(state => ({
          history: [entry, ...state.history],
          activeWorkout: null,
          lastCompletedWorkout: entry,
        }))
      },

      cancelWorkout: () => set({ activeWorkout: null }),

      addExerciseToWorkout: (exercise) => {
        const active = get().activeWorkout
        if (!active) return
        set({ activeWorkout: { ...active, exercises: [...active.exercises, exercise] } })
      },

      insertExerciseAtIndex: (exercise, index) => {
        const active = get().activeWorkout
        if (!active) return
        const exercises = [...active.exercises]
        exercises.splice(index, 0, exercise)
        set({ activeWorkout: { ...active, exercises } })
      },

      removeExerciseFromWorkout: (exerciseIndex) => {
        const active = get().activeWorkout
        if (!active) return
        set({ activeWorkout: { ...active, exercises: active.exercises.filter((_, i) => i !== exerciseIndex) } })
      },

      skipExercise: (exerciseIndex) => {
        const active = get().activeWorkout
        if (!active) return
        const exercises = [...active.exercises]
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], skipped: true }
        set({ activeWorkout: { ...active, exercises } })
      },

      unskipExercise: (exerciseIndex) => {
        const active = get().activeWorkout
        if (!active) return
        const exercises = [...active.exercises]
        exercises[exerciseIndex] = { ...exercises[exerciseIndex], skipped: false }
        set({ activeWorkout: { ...active, exercises } })
      },

      updateHistoryEntry: (workoutId, exercises) => {
        set(state => ({
          history: state.history.map(w =>
            w.id === workoutId ? { ...w, exercises } : w
          ),
        }))
      },

      deleteHistoryEntry: (workoutId) => {
        set(state => ({
          history: state.history.filter(w => w.id !== workoutId),
        }))
      },

      importHistory: (workouts) => set({ history: workouts }),

      clearAll: () => set({ history: [], activeWorkout: null, lastCompletedWorkout: null }),
    }),
    { name: 'hd_workouts' }
  )
)

export function getExerciseHistory(exerciseId: string, history: WorkoutEntry[], limit = 8): WorkoutEntry[] {
  return history
    .filter(w => w.exercises.some(e => e.id === exerciseId && !e.skipped))
    .slice(0, limit)
}

export function getLastSets(exerciseId: string, history: WorkoutEntry[]) {
  for (const workout of history) {
    const ex = workout.exercises.find(e => e.id === exerciseId)
    if (ex && !ex.skipped && ex.sets.length > 0) return ex.sets
  }
  return null
}

export function getExerciseLastDoneDate(exerciseId: string, history: WorkoutEntry[]): string | null {
  for (const workout of history) {
    const ex = workout.exercises.find(e => e.id === exerciseId)
    if (ex && !ex.skipped) return workout.date
  }
  return null
}
