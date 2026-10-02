import { useEffect, useState } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { gymEquipmentOptions } from "../lib/curatedWorkout";
import { useSettingsStore } from "../store/settingsStore";
import type { CustomGymEquipment } from "../types";

const categoryOptions: { label: string; value: string }[] = [
  { label: "Machines", value: "Machines" },
  { label: "Free Weights", value: "Free Weights" },
  { label: "Cardio", value: "Cardio" },
];

/* ── Small presentational pieces ───────────────────────────── */

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Neutral selection mark: solid white with a dark check when on, a quiet ring when off. */
function CheckMark({ on, shape = "circle" }: { on: boolean; shape?: "circle" | "square" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center transition-colors ${
        shape === "circle" ? "rounded-full" : "rounded-[7px]"
      } ${on ? "bg-text-primary" : "border-[1.5px] border-text-dim"}`}
    >
      {on && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0b0b0c"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}

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

  const title = mode === "edit" ? "Edit equipment" : "Add equipment";
  const buttonLabel = mode === "edit" ? "Save changes" : "Add equipment";

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/60 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[70] animate-slide-up">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="equipment-sheet-title"
          className="sheet-surface mx-auto max-w-[460px] rounded-t-[1.5rem] border-b-0 px-5 pt-3"
          style={{
            paddingBottom: "calc(1.25rem + max(0.75rem, env(safe-area-inset-bottom)))",
          }}
        >
          <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-fill-strong" />

          <h2 id="equipment-sheet-title" className="section-title px-1">
            {title}
          </h2>

          <div className="mt-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="equipment-name" className="section-label px-1">
                Name
              </label>
              <input
                id="equipment-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Smith Machine"
                className="input-shell input-focus h-12 w-full px-4 text-[15px] text-text-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span id="equipment-category-label" className="section-label px-1">
                Category
              </span>
              <div
                role="group"
                aria-labelledby="equipment-category-label"
                className="flex flex-wrap gap-2"
              >
                {categoryOptions.map((c) => {
                  const active = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      aria-pressed={active}
                      className={`chip min-h-11 px-4 text-[14px] ${
                        active
                          ? "bg-[#f4f4f5]! font-medium text-[#0b0b0c]"
                          : "chip-muted text-text-secondary active:bg-fill-strong"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1 text-[15px]">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!name.trim()}
                className="btn-primary flex-1 text-[15px]"
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
  meta,
  available,
  onToggle,
  isCustom,
  onRemove,
  onEdit,
  bulkMode,
  bulkSelected,
  onBulkToggle,
}: {
  label: string;
  meta?: string;
  available: boolean;
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

  const showRowActions = isCustom && !bulkMode;

  return (
    <div className={`flex min-h-[52px] items-center ${showRowActions ? "pr-1.5" : ""}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={bulkMode ? !!bulkSelected : available}
        className={`flex min-h-[52px] min-w-0 flex-1 items-center gap-3.5 py-2 pl-4 text-left transition-colors active:bg-fill ${
          showRowActions ? "pr-2" : "pr-4"
        }`}
      >
        {bulkMode ? (
          <CheckMark on={!!bulkSelected} shape="square" />
        ) : (
          <CheckMark on={available} />
        )}

        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={`truncate text-[15px] transition-colors ${
              available ? "text-text-primary" : "text-text-muted"
            }`}
          >
            {label}
          </span>
          {meta && <span className="truncate text-[13px] text-text-muted">{meta}</span>}
        </span>
      </button>

      {/* Edit button (custom only, not in bulk mode) */}
      {isCustom && onEdit && !bulkMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors active:bg-fill"
          aria-label="Edit equipment"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[18px] w-[18px]"
            aria-hidden="true"
          >
            <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
        </button>
      )}

      {/* Remove button (custom only, not in bulk mode) — tap twice to confirm */}
      {isCustom && onRemove && !bulkMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className={`shrink-0 transition-colors ${
            confirmRemove
              ? "btn-danger mr-1.5 ml-1 !min-h-11 !bg-accent-red px-3.5 text-[13px] !text-white animate-fade-in"
              : "flex h-11 w-11 items-center justify-center rounded-full text-text-muted active:bg-fill"
          }`}
          aria-label={confirmRemove ? "Confirm remove" : "Remove equipment"}
        >
          {confirmRemove ? (
            "Remove"
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
              aria-hidden="true"
            >
              <path d="M4 7h16M10 11v6M14 11v6M5.5 7l.9 11.2A2 2 0 008.4 20h7.2a2 2 0 002-1.8L18.5 7M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

/* ── Category section header with Select/Deselect All ──────── */

function CategoryHeader({
  label,
  availableCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
}: {
  label: string;
  availableCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const allSelected = availableCount === totalCount;

  return (
    <div className="flex min-h-8 items-center gap-2 px-1">
      <h2 className="section-label">{label}</h2>
      <span className="text-[13px] tabular-nums text-text-muted">
        {availableCount}/{totalCount}
      </span>
      <button
        type="button"
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="btn-tertiary -my-1.5 -mr-2 ml-auto px-2 text-[13px]"
      >
        {allSelected ? "Deselect all" : "Select all"}
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
    <PageLayout className="flex flex-col gap-7">
      {/* Header */}
      <header className="flex items-end justify-between gap-3 px-1 pt-2">
        <div className="min-w-0">
          <h1 className="page-title">My Gym</h1>
          <p className="mt-1 text-[13px] tabular-nums text-text-muted">
            {availableCount} of {totalItems} available
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSheet({ mode: "add" })}
          className="btn-icon shrink-0 text-text-primary"
          aria-label="Add equipment"
        >
          <PlusIcon />
        </button>
      </header>

      {/* Equipment list by category */}
      {categories.map((cat) => {
        const items = groupedStatic[cat] || [];
        if (items.length === 0) return null;
        const catAvailable = items.filter((i) => gymEquipment[i.id]).length;

        return (
          <section key={cat} className="flex flex-col gap-2">
            <CategoryHeader
              label={cat}
              availableCount={catAvailable}
              totalCount={items.length}
              onSelectAll={() => bulkSetGymEquipmentAvailability(items.map((i) => i.id), true)}
              onDeselectAll={() => bulkSetGymEquipmentAvailability(items.map((i) => i.id), false)}
            />
            <div className="list-group">
              {items.map((item) => (
                <EquipmentRow
                  key={item.id}
                  label={item.label}
                  available={gymEquipment[item.id] ?? true}
                  onToggle={() => setGymEquipmentAvailability(item.id, !gymEquipment[item.id])}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Custom equipment section */}
      {hasCustom && (
        <section className="flex flex-col gap-2">
          {bulkMode ? (
            /* Bulk selection bar */
            <div className="flex min-h-8 items-center gap-1 px-1 animate-fade-in">
              <h2 className="section-label tabular-nums text-text-secondary">
                {bulkSelected.size} selected
              </h2>
              <div className="-my-1.5 -mr-2 ml-auto flex items-center">
                <button
                  type="button"
                  onClick={handleBulkSelectAllCustom}
                  className="btn-tertiary px-2 text-[13px]"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setBulkSelected(new Set())}
                  className="btn-tertiary px-2 text-[13px]"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
                  className="btn-tertiary px-2 text-[13px] text-text-primary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-8 items-center gap-2 px-1">
              <h2 className="section-label">Custom</h2>
              <span className="text-[13px] tabular-nums text-text-muted">
                {customGymEquipment.filter((c) => gymEquipment[c.id]).length}/{customGymEquipment.length}
              </span>
              {/* Bulk mode toggle */}
              <button
                type="button"
                onClick={() => (bulkMode ? exitBulkMode() : setBulkMode(true))}
                className="btn-tertiary -my-1.5 -mr-2 ml-auto px-2 text-[13px]"
              >
                Select
              </button>
            </div>
          )}

          <div className="list-group">
            {customGymEquipment.map((item) => (
              <EquipmentRow
                key={item.id}
                label={item.label}
                meta={item.category}
                available={gymEquipment[item.id] ?? true}
                onToggle={() => setGymEquipmentAvailability(item.id, !gymEquipment[item.id])}
                isCustom
                onRemove={() => handleRemoveCustom(item.id)}
                onEdit={() => setShowSheet({ mode: "edit", item })}
                bulkMode={bulkMode}
                bulkSelected={bulkSelected.has(item.id)}
                onBulkToggle={() => handleBulkToggle(item.id)}
              />
            ))}
          </div>

          {bulkMode && bulkSelected.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className={`btn-danger mt-1 w-full text-[15px] animate-fade-in ${
                confirmBulkDelete ? "!bg-accent-red !text-white" : ""
              }`}
            >
              {confirmBulkDelete
                ? `Confirm delete (${bulkSelected.size})`
                : `Delete (${bulkSelected.size})`}
            </button>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="list-group">
          <button
            type="button"
            onClick={resetGymEquipment}
            className="flex min-h-[52px] w-full items-center px-4 text-left text-[15px] text-accent-red transition-colors active:bg-fill"
          >
            Reset all equipment
          </button>
        </div>
        <p className="section-caption px-1">
          Turns built-in items back on and removes custom ones.
        </p>
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
