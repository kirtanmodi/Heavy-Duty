import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProgramId } from '../types'

interface SettingsState {
  activeProgram: ProgramId | null
  restTimerSeconds: number
  setActiveProgram: (id: ProgramId) => void
  setRestTimerSeconds: (seconds: number) => void
  clearAll: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activeProgram: null,
      restTimerSeconds: 120,
      setActiveProgram: (id) => set({ activeProgram: id }),
      setRestTimerSeconds: (seconds) => set({ restTimerSeconds: seconds }),
      clearAll: () => set({ activeProgram: null, restTimerSeconds: 120 }),
    }),
    { name: 'hd_settings' }
  )
)
