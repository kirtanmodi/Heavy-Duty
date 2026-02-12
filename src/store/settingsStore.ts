import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProgramId } from '../types'

interface SettingsState {
  activeProgram: ProgramId
  restTimerSeconds: number
  setRestTimerSeconds: (seconds: number) => void
  clearAll: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activeProgram: 'heavy-duty-complete' as const,
      restTimerSeconds: 120,
      setRestTimerSeconds: (seconds) => set({ restTimerSeconds: seconds }),
      clearAll: () => set({ activeProgram: 'heavy-duty-complete', restTimerSeconds: 120 }),
    }),
    { name: 'hd_settings' }
  )
)
