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
  bulkSetGymEquipmentAvailability: (equipmentIds: string[], available: boolean) => void;
  addCustomGymEquipment: (item: CustomGymEquipment) => void;
  updateCustomGymEquipment: (id: string, updates: Partial<Pick<CustomGymEquipment, 'label' | 'category'>>) => void;
  removeCustomGymEquipment: (id: string) => void;
  bulkRemoveCustomGymEquipment: (ids: string[]) => void;
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
      bulkSetGymEquipmentAvailability: (equipmentIds, available) =>
        set((state) => {
          const updated = { ...state.gymEquipment };
          for (const id of equipmentIds) updated[id] = available;
          return { gymEquipment: updated };
        }),
      addCustomGymEquipment: (item) =>
        set((state) => ({
          customGymEquipment: [...state.customGymEquipment, item],
          gymEquipment: { ...state.gymEquipment, [item.id]: true },
        })),
      updateCustomGymEquipment: (id, updates) =>
        set((state) => ({
          customGymEquipment: state.customGymEquipment.map((e) =>
            e.id === id ? { ...e, ...updates } : e,
          ),
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
      bulkRemoveCustomGymEquipment: (ids) =>
        set((state) => {
          const idSet = new Set(ids);
          const gymEquipment = { ...state.gymEquipment };
          for (const id of ids) delete gymEquipment[id];
          return {
            customGymEquipment: state.customGymEquipment.filter((e) => !idSet.has(e.id)),
            gymEquipment,
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
