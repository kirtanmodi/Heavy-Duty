import { useEffect, useState } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { gymEquipmentOptions } from "../lib/curatedWorkout";
import { useSettingsStore } from "../store/settingsStore";
import type { CustomGymEquipment } from "../types";

const categoryColors: Record<string, string> = {
  Machines: "#4488FF",
  "Free Weights": "#FF6B35",
  Cardio: "#46D369",
  Custom: "#FFAA00",
};

const categoryOptions: { label: string; value: string }[] = [
  { label: "Machines", value: "Machines" },
  { label: "Free Weights", value: "Free Weights" },
  { label: "Cardio", value: "Cardio" },
];

/* ── Bottom sheet for Add / Edit ───────────────────────────── */

function EquipmentSheet({
  mode,
  initial,
  onClose,
}: {
  mode: "add" | "edit";
  initial?: CustomGymEquipment;
  onClose: () => void;
}) {
  const { addCustomGymEquipment, updateCustomGymEquipment } = useSettingsStore();
  const [name, setName] = useState(initial?.label ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Machines");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (mode === "edit" && initial) {
      updateCustomGymEquipment(initial.id, { label: trimmed, category });
    } else {
      addCustomGymEquipment({ id: `custom-${Date.now()}`, label: trimmed, category });
    }
    onClose();
  };

  const color = categoryColors[category] || "#888";
  const title = mode === "edit" ? "EDIT EQUIPMENT" : "ADD EQUIPMENT";
  const buttonLabel = mode === "edit" ? "Save Changes" : "Add Equipment";

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/60 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[70] animate-slide-up">
        <div
          className="mx-auto max-w-[460px] rounded-t-3xl border-t border-white/[0.08] px-6 pt-5"
          style={{
            background: "linear-gradient(180deg, #1a1a20 0%, #111114 100%)",
            paddingBottom: "calc(5rem + max(0.5rem, env(safe-area-inset-bottom)))",
          }}
        >
          <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/[0.12]" />

          <h3 className="mb-4 font-[var(--font-display)] text-xl tracking-wider text-text-primary">
            {title}
          </h3>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Name
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Smith Machine"
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-text-primary placeholder:text-text-dim outline-none focus:border-white/20 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pr-8 text-sm text-text-primary outline-none"
                >
                  {categoryOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim"
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {name.trim() && (
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 animate-fade-in"
                style={{ background: `${color}10`, border: `1px solid ${color}20` }}
              >
                <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span className="text-xs text-text-secondary">
                  {name.trim()} will be {mode === "edit" ? "updated in" : "added to"}{" "}
                  <span style={{ color }}>{category}</span>
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={onClose}
                className="rounded-xl border border-white/[0.1] bg-transparent py-3 text-sm font-medium text-text-secondary transition-colors active:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim()}
                className="rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-30"
                style={{
                  background: `linear-gradient(135deg, ${color}, ${color}CC)`,
                  boxShadow: `0 4px 16px ${color}30`,
                }}
              >
                {buttonLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Equipment row ──────────────────────────────────────────── */

function EquipmentRow({
  label,
  available,
  color,
  onToggle,
  isCustom,
  onRemove,
  onEdit,
  bulkMode,
  bulkSelected,
  onBulkToggle,
}: {
  label: string;
  available: boolean;
  color: string;
  onToggle: () => void;
  isCustom?: boolean;
  onRemove?: () => void;
  onEdit?: () => void;
  bulkMode?: boolean;
  bulkSelected?: boolean;
  onBulkToggle?: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!confirmRemove) return;
    const id = setTimeout(() => setConfirmRemove(false), 2000);
    return () => clearTimeout(id);
  }, [confirmRemove]);

  const handleRemove = () => {
    if (confirmRemove) {
      onRemove?.();
    } else {
      setConfirmRemove(true);
    }
  };

  const handleClick = () => {
    if (bulkMode) {
      onBulkToggle?.();
    } else {
      onToggle();
    }
  };

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors active:bg-white/[0.04] cursor-pointer"
      onClick={handleClick}
    >
      {/* Bulk selection checkbox */}
      {bulkMode ? (
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all"
          style={
            bulkSelected
              ? { borderColor: "#E53935", background: "#E5393520" }
              : { borderColor: "rgba(255,255,255,0.12)", background: "transparent" }
          }
        >
          {bulkSelected && (
            <svg viewBox="0 0 24 24" fill="none" stroke="#E53935" strokeWidth="3" className="h-3 w-3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ) : (
        /* Toggle indicator */
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all"
          style={
            available
              ? { borderColor: color, background: `${color}20` }
              : { borderColor: "rgba(255,255,255,0.12)", background: "transparent" }
          }
        >
          {available && (
            <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" className="h-3 w-3">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}

      {/* Label */}
      <span
        className={`flex-1 text-[14px] font-medium transition-colors ${
          available ? "text-text-primary" : "text-text-dim"
        }`}
      >
        {label}
      </span>

      {/* Custom badge */}
      {isCustom && !bulkMode && (
        <span className="rounded-full bg-accent-yellow/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-accent-yellow">
          Custom
        </span>
      )}

      {/* Edit button (custom only, not in bulk mode) */}
      {isCustom && onEdit && !bulkMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-dim hover:text-text-muted active:bg-white/[0.06] transition-all"
          aria-label="Edit equipment"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
            <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
        </button>
      )}

      {/* Remove button (custom only, not in bulk mode) */}
      {isCustom && onRemove && !bulkMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
            confirmRemove
              ? "bg-accent-red/15 text-accent-red scale-110"
              : "text-text-dim hover:text-text-muted active:bg-white/[0.06]"
          }`}
          aria-label={confirmRemove ? "Confirm remove" : "Remove equipment"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
            <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── Category section header with Select/Deselect All ──────── */

function CategoryHeader({
  label,
  color,
  availableCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
}: {
  label: string;
  color: string;
  availableCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const allSelected = availableCount === totalCount;

  return (
    <div className="flex items-center gap-2 px-0.5 mb-1">
      <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted">
        {label}
      </h3>
      <span className="text-[10px] text-text-dim">
        {availableCount}/{totalCount}
      </span>
      <button
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="ml-auto text-[10px] font-semibold uppercase tracking-wider transition-colors active:opacity-70"
        style={{ color }}
      >
        {allSelected ? "Deselect All" : "Select All"}
      </button>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */

export function MyGym() {
  const [showSheet, setShowSheet] = useState<{ mode: "add" | "edit"; item?: CustomGymEquipment } | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const {
    gymEquipment,
    customGymEquipment,
    setGymEquipmentAvailability,
    bulkSetGymEquipmentAvailability,
    removeCustomGymEquipment,
    bulkRemoveCustomGymEquipment,
    resetGymEquipment,
  } = useSettingsStore();

  const exitBulkMode = () => {
    setBulkMode(false);
    setBulkSelected(new Set());
    setConfirmBulkDelete(false);
  };

  const handleRemoveCustom = (id: string) => {
    removeCustomGymEquipment(id);
    if (customGymEquipment.length <= 1) exitBulkMode();
  };

  // Auto-reset confirm after timeout
  useEffect(() => {
    if (!confirmBulkDelete) return;
    const id = setTimeout(() => setConfirmBulkDelete(false), 3000);
    return () => clearTimeout(id);
  }, [confirmBulkDelete]);

  const groupedStatic = gymEquipmentOptions.reduce(
    (acc, opt) => {
      if (!acc[opt.category]) acc[opt.category] = [];
      acc[opt.category].push(opt);
      return acc;
    },
    {} as Record<string, typeof gymEquipmentOptions>,
  );

  const categories = ["Machines", "Free Weights", "Cardio"] as const;
  const hasCustom = customGymEquipment.length > 0;

  const totalItems = gymEquipmentOptions.length + customGymEquipment.length;
  const availableCount =
    gymEquipmentOptions.filter((o) => gymEquipment[o.id]).length +
    customGymEquipment.filter((c) => gymEquipment[c.id]).length;

  const handleBulkToggle = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (bulkSelected.size === 0) return;
    if (confirmBulkDelete) {
      bulkRemoveCustomGymEquipment(Array.from(bulkSelected));
      exitBulkMode();
    } else {
      setConfirmBulkDelete(true);
    }
  };

  const handleBulkSelectAllCustom = () => {
    setBulkSelected(new Set(customGymEquipment.map((c) => c.id)));
  };

  return (
    <PageLayout className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-end justify-between pt-1">
        <div>
          <h1 className="font-[var(--font-display)] text-[2rem] leading-none tracking-wider text-text-primary">
            MY GYM
          </h1>
          <p className="mt-1 text-[12px] text-text-dim">
            {availableCount}/{totalItems} equipment available
          </p>
        </div>
        <button
          onClick={() => setShowSheet({ mode: "add" })}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-red/15 text-accent-red transition-all active:scale-90"
          aria-label="Add equipment"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
            <path d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </header>

      <section className="surface-card-muted rounded-[1.35rem] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">Equipment setup</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Toggle what is available in your gym. Built-in equipment stays grouped below, and custom items live in their own section.
            </p>
          </div>
          <div className="shrink-0 rounded-[1rem] border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">Available</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-text-primary">{availableCount}/{totalItems}</p>
          </div>
        </div>
      </section>

      {/* Equipment list by category */}
      {categories.map((cat) => {
        const items = groupedStatic[cat] || [];
        if (items.length === 0) return null;
        const color = categoryColors[cat];
        const catAvailable = items.filter((i) => gymEquipment[i.id]).length;

        return (
          <section key={cat} className="flex flex-col gap-1">
            <CategoryHeader
              label={cat}
              color={color}
              availableCount={catAvailable}
              totalCount={items.length}
              onSelectAll={() => bulkSetGymEquipmentAvailability(items.map((i) => i.id), true)}
              onDeselectAll={() => bulkSetGymEquipmentAvailability(items.map((i) => i.id), false)}
            />
            <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              {items.map((item, idx) => (
                <div key={item.id}>
                  {idx > 0 && <div className="mx-3 border-t border-white/[0.04]" />}
                  <EquipmentRow
                    label={item.label}
                    available={gymEquipment[item.id] ?? true}
                    color={color}
                    onToggle={() => setGymEquipmentAvailability(item.id, !gymEquipment[item.id])}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Custom equipment section */}
      {hasCustom && (
        <section className="flex flex-col gap-1">
          <div className="flex items-center gap-2 px-0.5 mb-1">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: categoryColors.Custom }} />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted">
              Custom
            </h3>
            <span className="text-[10px] text-text-dim">
              {customGymEquipment.filter((c) => gymEquipment[c.id]).length}/{customGymEquipment.length}
            </span>
            {/* Bulk mode toggle */}
            <button
              onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)}
              className={`ml-auto text-[10px] font-semibold uppercase tracking-wider transition-colors active:opacity-70 ${
                bulkMode ? "text-accent-red" : "text-accent-yellow"
              }`}
            >
              {bulkMode ? "Done" : "Manage"}
            </button>
          </div>

          {/* Bulk actions bar */}
          {bulkMode && (
            <div className="flex items-center gap-2 mb-1 animate-fade-in">
              <button
                onClick={handleBulkSelectAllCustom}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors active:bg-white/[0.1]"
              >
                Select All
              </button>
              <button
                onClick={() => setBulkSelected(new Set())}
                className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors active:bg-white/[0.1]"
              >
                Clear
              </button>
              {bulkSelected.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className={`ml-auto rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${
                    confirmBulkDelete
                      ? "bg-accent-red text-white animate-pulse"
                      : "bg-accent-red/15 text-accent-red"
                  }`}
                >
                  {confirmBulkDelete
                    ? `Confirm Delete (${bulkSelected.size})`
                    : `Delete (${bulkSelected.size})`}
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            {customGymEquipment.map((item, idx) => (
              <div key={item.id}>
                {idx > 0 && <div className="mx-3 border-t border-white/[0.04]" />}
                <EquipmentRow
                  label={item.label}
                  available={gymEquipment[item.id] ?? true}
                  color={categoryColors[item.category] || categoryColors.Custom}
                  onToggle={() => setGymEquipmentAvailability(item.id, !gymEquipment[item.id])}
                  isCustom
                  onRemove={() => handleRemoveCustom(item.id)}
                  onEdit={() => setShowSheet({ mode: "edit", item })}
                  bulkMode={bulkMode}
                  bulkSelected={bulkSelected.has(item.id)}
                  onBulkToggle={() => handleBulkToggle(item.id)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="surface-card rounded-[1.45rem] p-4">
        <div className="flex flex-col gap-1">
          <p className="section-label">Reset</p>
          <p className="text-sm font-semibold text-text-primary">Reset built-in equipment</p>
          <p className="text-sm leading-relaxed text-text-muted">
            Restore the default availability for built-in equipment. Custom equipment stays in your list.
          </p>
        </div>
        <button
          onClick={resetGymEquipment}
          className="btn-ghost mt-4 w-full py-3 text-sm font-semibold"
        >
          Reset All Equipment
        </button>
      </section>

      {showSheet && (
        <EquipmentSheet
          mode={showSheet.mode}
          initial={showSheet.item}
          onClose={() => setShowSheet(null)}
        />
      )}
    </PageLayout>
  );
}
