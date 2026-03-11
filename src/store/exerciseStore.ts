import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Equipment, Exercise } from '../types'

interface ExerciseState {
  customExercises: Exercise[]
  nameOverrides: Record<string, string>
  removedIds: string[]
  weightMode: Record<string, 'bodyweight' | 'weighted'>
  equipmentOverride: Record<string, Equipment>

  renameExercise: (id: string, name: string) => void
  addExercise: (exercise: Exercise) => void
  removeExercise: (id: string) => void
  undoRemove: (id: string) => void
  setWeightMode: (id: string, mode: 'bodyweight' | 'weighted') => void
  setEquipmentOverride: (id: string, equipment: Equipment) => void
}

export const useExerciseStore = create<ExerciseState>()(
  persist(
    (set) => ({
      customExercises: [],
      nameOverrides: {},
      removedIds: [],
      weightMode: {},
      equipmentOverride: {},

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

      setWeightMode: (id, mode) =>
        set((state) => ({
          weightMode: { ...state.weightMode, [id]: mode },
        })),

      setEquipmentOverride: (id, equipment) =>
        set((state) => ({
          equipmentOverride: { ...state.equipmentOverride, [id]: equipment },
        })),
    }),
    { name: 'hd_exercises' }
  )
)
