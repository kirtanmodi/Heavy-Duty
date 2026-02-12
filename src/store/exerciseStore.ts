import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Exercise } from '../types'

interface ExerciseState {
  customExercises: Exercise[]
  nameOverrides: Record<string, string>
  removedIds: string[]

  renameExercise: (id: string, name: string) => void
  addExercise: (exercise: Exercise) => void
  removeExercise: (id: string) => void
  undoRemove: (id: string) => void
}

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set) => ({
      customExercises: [],
      nameOverrides: {},
      removedIds: [],

      renameExercise: (id, name) =>
        set((state) => ({
          nameOverrides: { ...state.nameOverrides, [id]: name },
          customExercises: state.customExercises.map((e) =>
            e.id === id ? { ...e, name } : e
          ),
        })),

      addExercise: (exercise) =>
        set((state) => ({
          customExercises: [...state.customExercises, exercise],
        })),

      removeExercise: (id) =>
        set((state) => ({
          removedIds: [...state.removedIds, id],
          customExercises: state.customExercises.filter((e) => e.id !== id),
        })),

      undoRemove: (id) =>
        set((state) => ({
          removedIds: state.removedIds.filter((rid) => rid !== id),
        })),
    }),
    { name: 'hd_exercises' }
  )
)
