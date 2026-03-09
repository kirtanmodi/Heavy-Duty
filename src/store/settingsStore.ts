import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProgramId } from '../types'

interface SettingsState {
  activeProgram: ProgramId
  restTimerSeconds: number
  autoStartTimer: boolean
  setRestTimerSeconds: (seconds: number) => void
  setAutoStartTimer: (enabled: boolean) => void
  clearAll: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activeProgram: 'heavy-duty-complete' as const,
      restTimerSeconds: 120,
      autoStartTimer: true,
      setRestTimerSeconds: (seconds) => set({ restTimerSeconds: seconds }),
      setAutoStartTimer: (enabled) => set({ autoStartTimer: enabled }),
      clearAll: () => set({ activeProgram: 'heavy-duty-complete', restTimerSeconds: 120, autoStartTimer: true }),
    }),
    { name: 'hd_settings' }
  )
)
