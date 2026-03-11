import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultGymEquipmentProfile } from "../lib/curatedWorkout";
import type { CustomGymEquipment, GymEquipmentProfile, ProgramId } from "../types";

function buildDefaultGymEquipmentProfile(): GymEquipmentProfile {
  return { ...defaultGymEquipmentProfile };
}

interface SettingsState {
  activeProgram: ProgramId;
  restTimerSeconds: number;
  autoStartTimer: boolean;
  gymEquipment: GymEquipmentProfile;
  customGymEquipment: CustomGymEquipment[];
  setRestTimerSeconds: (seconds: number) => void;
  setAutoStartTimer: (enabled: boolean) => void;
  setGymEquipmentAvailability: (equipmentId: string, available: boolean) => void;
  addCustomGymEquipment: (item: CustomGymEquipment) => void;
  removeCustomGymEquipment: (id: string) => void;
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
      customGymEquipment: [],
      setRestTimerSeconds: (seconds) => set({ restTimerSeconds: seconds }),
      setAutoStartTimer: (enabled) => set({ autoStartTimer: enabled }),
      setGymEquipmentAvailability: (equipmentId, available) =>
        set((state) => ({
          gymEquipment: {
            ...state.gymEquipment,
            [equipmentId]: available,
          },
        })),
      addCustomGymEquipment: (item) =>
        set((state) => ({
          customGymEquipment: [...state.customGymEquipment, item],
          gymEquipment: { ...state.gymEquipment, [item.id]: true },
        })),
      removeCustomGymEquipment: (id) =>
        set((state) => {
          const { [id]: _removed, ...rest } = state.gymEquipment;
          void _removed;
          return {
            customGymEquipment: state.customGymEquipment.filter((e) => e.id !== id),
            gymEquipment: rest,
          };
        }),
      resetGymEquipment: () =>
        set({ gymEquipment: buildDefaultGymEquipmentProfile(), customGymEquipment: [] }),
      clearAll: () =>
        set({
          activeProgram: "heavy-duty-complete",
          restTimerSeconds: 120,
          autoStartTimer: true,
          gymEquipment: buildDefaultGymEquipmentProfile(),
          customGymEquipment: [],
        }),
    }),
    {
      name: "hd_settings",
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as object) };
        const s = state as SettingsState;
        // Backfill any new equipment IDs that didn't exist when the user last saved
        s.gymEquipment = { ...buildDefaultGymEquipmentProfile(), ...s.gymEquipment };
        if (!s.customGymEquipment) s.customGymEquipment = [];
        return s;
      },
    },
  ),
);
