import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultGymEquipmentProfile } from "../lib/curatedWorkout";
import type { GymEquipmentId, GymEquipmentProfile, ProgramId } from "../types";

function buildDefaultGymEquipmentProfile(): GymEquipmentProfile {
  return { ...defaultGymEquipmentProfile };
}

interface SettingsState {
  activeProgram: ProgramId;
  restTimerSeconds: number;
  autoStartTimer: boolean;
  gymEquipment: GymEquipmentProfile;
  setRestTimerSeconds: (seconds: number) => void;
  setAutoStartTimer: (enabled: boolean) => void;
  setGymEquipmentAvailability: (equipmentId: GymEquipmentId, available: boolean) => void;
  resetGymEquipment: () => void;
  clearAll: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activeProgram: "heavy-duty-complete" as const,
      restTimerSeconds: 120,
      autoStartTimer: true,
      gymEquipment: buildDefaultGymEquipmentProfile(),
      setRestTimerSeconds: (seconds) => set({ restTimerSeconds: seconds }),
      setAutoStartTimer: (enabled) => set({ autoStartTimer: enabled }),
      setGymEquipmentAvailability: (equipmentId, available) =>
        set((state) => ({
          gymEquipment: {
            ...state.gymEquipment,
            [equipmentId]: available,
          },
        })),
      resetGymEquipment: () => set({ gymEquipment: buildDefaultGymEquipmentProfile() }),
      clearAll: () =>
        set({
          activeProgram: "heavy-duty-complete",
          restTimerSeconds: 120,
          autoStartTimer: true,
          gymEquipment: buildDefaultGymEquipmentProfile(),
        }),
    }),
    { name: "hd_settings" },
  ),
);
