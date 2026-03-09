import { useMemo } from "react";
import { getEffectiveExercise, muscleColors } from "../data/exercises";
import { useWorkoutStore } from "../store/workoutStore";
import type { MuscleGroup } from "../types";

// Display-friendly labels for muscle groups (consolidated)
const MUSCLE_DISPLAY: Record<string, { label: string; color: string; muscles: MuscleGroup[] }> = {
  chest: { label: "Chest", color: muscleColors.chest, muscles: ["chest", "upper-chest"] },
  back: { label: "Back", color: muscleColors.lats, muscles: ["lats", "mid-back", "lower-back"] },
  shoulders: { label: "Shoulders", color: muscleColors["front-delts"], muscles: ["front-delts", "side-delts", "rear-delts"] },
  biceps: { label: "Biceps", color: muscleColors.biceps, muscles: ["biceps"] },
  triceps: { label: "Triceps", color: muscleColors.triceps, muscles: ["triceps"] },
  quads: { label: "Quads", color: muscleColors.quads, muscles: ["quads"] },
  hamstrings: { label: "Hamstrings", color: muscleColors.hamstrings, muscles: ["hamstrings"] },
  glutes: { label: "Glutes", color: muscleColors.glutes, muscles: ["glutes"] },
  calves: { label: "Calves", color: muscleColors.calves, muscles: ["calves"] },
  core: { label: "Core", color: muscleColors.core, muscles: ["core"] },
};

const TARGET_SETS = 15; // Reasonable weekly target per muscle group

export function MuscleVolumeCard() {
  const history = useWorkoutStore((s) => s.history);

  const volumeData = useMemo(() => {
    // Get current week (Mon-Sun)
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const weekWorkouts = history.filter((w) => new Date(w.date) >= weekStart);

    // Count sets per muscle group
    const counts: Record<string, number> = {};

    for (const w of weekWorkouts) {
      for (const ex of w.exercises) {
        if (ex.skipped) continue;
        const exercise = getEffectiveExercise(ex.id);
        if (!exercise) continue;
        const completedSets = ex.sets.filter((s) => s.reps > 0).length;
        for (const muscle of exercise.primaryMuscles) {
          counts[muscle] = (counts[muscle] || 0) + completedSets;
        }
      }
    }

    // Aggregate into display groups
    const results: { key: string; label: string; color: string; sets: number }[] = [];
    for (const [key, group] of Object.entries(MUSCLE_DISPLAY)) {
      const sets = group.muscles.reduce((sum, m) => sum + (counts[m] || 0), 0);
      if (sets > 0) results.push({ key, label: group.label, color: group.color, sets });
    }

    results.sort((a, b) => b.sets - a.sets);
    return results;
  }, [history]);

  if (volumeData.length === 0) {
    return null;
  }

  const maxSets = Math.max(...volumeData.map((d) => d.sets), TARGET_SETS);

  return (
    <div
      className="col-span-2 flex flex-col gap-3 rounded-[14px] bg-bg-card p-4 card-surface animate-fade-up"
      style={{ animationDelay: "375ms" }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">
          Weekly Volume
        </span>
        <span className="text-[10px] text-text-dim">sets / muscle</span>
      </div>

      <div className="flex flex-col gap-2">
        {volumeData.map((d) => {
          const pct = (d.sets / maxSets) * 100;
          const atTarget = d.sets >= TARGET_SETS;

          return (
            <div key={d.key} className="flex items-center gap-2.5">
              <span className="w-20 shrink-0 text-[11px] font-medium text-text-secondary">
                {d.label}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-white/[0.04]">
                {/* Target marker */}
                <div
                  className="absolute top-0 h-full w-px bg-white/[0.12]"
                  style={{ left: `${(TARGET_SETS / maxSets) * 100}%` }}
                />
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: atTarget
                      ? `linear-gradient(90deg, ${d.color}CC, ${d.color})`
                      : `${d.color}60`,
                  }}
                />
              </div>
              <span
                className="w-6 text-right text-[11px] font-bold tabular-nums"
                style={{ color: atTarget ? d.color : "var(--color-text-dim)" }}
              >
                {d.sets}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <div className="h-px w-3 bg-white/[0.12]" />
        <span className="text-[9px] text-text-dim">target: {TARGET_SETS} sets</span>
      </div>
    </div>
  );
}
