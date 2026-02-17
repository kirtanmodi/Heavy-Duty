import { useState } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { exerciseGroups, getEffectiveExercisesByGroup } from "../data/exercises";
import { useExerciseStore } from "../store/exerciseStore";
import type { Exercise, Equipment, MuscleGroup } from "../types";

const equipmentOptions: Equipment[] = ["barbell", "dumbbells", "cable", "machine", "bodyweight+"];

const muscleOptions: { label: string; value: MuscleGroup }[] = [
  { label: "Chest", value: "chest" },
  { label: "Lats", value: "lats" },
  { label: "Mid Back", value: "mid-back" },
  { label: "Front Delts", value: "front-delts" },
  { label: "Side Delts", value: "side-delts" },
  { label: "Rear Delts", value: "rear-delts" },
  { label: "Biceps", value: "biceps" },
  { label: "Triceps", value: "triceps" },
  { label: "Traps", value: "traps" },
  { label: "Quads", value: "quads" },
  { label: "Hamstrings", value: "hamstrings" },
  { label: "Glutes", value: "glutes" },
  { label: "Calves", value: "calves" },
  { label: "Core", value: "core" },
];

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const { renameExercise, removeExercise } = useExerciseStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(exercise.name);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== exercise.name) {
      renameExercise(exercise.id, trimmed);
    } else {
      setName(exercise.name);
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 rounded-[10px] bg-bg-card card-surface px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setName(exercise.name); setEditing(false); }
            }}
            className="rounded-[8px] border border-border-card bg-bg-input px-2 py-1 text-sm text-text-primary outline-none input-focus"
          />
        ) : (
          <span className="truncate text-sm font-medium text-text-primary">{exercise.name}</span>
        )}
        <span className="text-[11px] text-text-muted">{exercise.equipment} · {exercise.type}</span>
      </div>

      <button
        onClick={() => setEditing(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-transparent text-text-muted transition-colors active:border-border-card active:bg-bg-input"
        aria-label="Rename exercise"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        </svg>
      </button>

      <button
        onClick={() => removeExercise(exercise.id)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-transparent text-text-muted transition-colors active:border-border-card active:bg-bg-input"
        aria-label="Remove exercise"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
          <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  );
}

function AddExerciseForm({ onClose }: { onClose: () => void }) {
  const { addExercise } = useExerciseStore();
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup>("chest");
  const [equipment, setEquipment] = useState<Equipment>("barbell");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const exercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      equipment,
      type: "isolation",
      primaryMuscles: [muscle],
      secondaryMuscles: [],
      mentzerTips: "",
      repRange: [8, 10],
      restSeconds: 60,
      weightIncrement: 2,
      supersetWith: null,
    };

    addExercise(exercise);
    onClose();
  };

  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-bg-card card-surface p-5 animate-slide-up">
      <h3 className="text-sm font-semibold text-text-secondary">New Exercise</h3>

      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Exercise name"
        className="rounded-[10px] border border-border-card bg-bg-input px-3 py-2.5 text-sm text-text-primary placeholder:text-text-dim outline-none input-focus"
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-text-muted">Muscle Group</label>
          <select
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
            className="rounded-[10px] border border-border-card bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none"
          >
            {muscleOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-text-muted">Equipment</label>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment)}
            className="rounded-[10px] border border-border-card bg-bg-input px-3 py-2.5 text-sm text-text-primary outline-none"
          >
            {equipmentOptions.map((eq) => (
              <option key={eq} value={eq}>{eq}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onClose}
          className="rounded-[10px] btn-ghost py-2.5 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="rounded-[10px] btn-primary py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function Exercises() {
  const [showAdd, setShowAdd] = useState(false);
  useExerciseStore();

  return (
    <PageLayout className="flex flex-col gap-6">
      <header className="flex items-center justify-between pt-1">
        <h1 className="font-[var(--font-display)] text-[1.75rem] tracking-widest text-text-primary">EXERCISES</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="rounded-[10px] btn-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          {showAdd ? "Close" : "+ Add"}
        </button>
      </header>

      {showAdd && <AddExerciseForm onClose={() => setShowAdd(false)} />}

      {exerciseGroups.map((group) => {
        const groupExercises = getEffectiveExercisesByGroup(group.label);
        if (groupExercises.length === 0) return null;

        return (
          <section key={group.label} className="flex flex-col gap-2">
            <h3 className="px-0.5 text-xs font-semibold tracking-widest text-text-muted uppercase">{group.label}</h3>
            <div className="flex flex-col gap-1.5">
              {groupExercises.map((exercise) => (
                <ExerciseRow key={exercise.id} exercise={exercise} />
              ))}
            </div>
          </section>
        );
      })}
    </PageLayout>
  );
}
