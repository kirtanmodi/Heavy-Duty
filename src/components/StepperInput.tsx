import { useRef, useCallback, useEffect } from "react";

interface StepperInputProps {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  placeholder?: string;
  inputMode?: "numeric" | "decimal";
  prevHint?: string;
  onPrevTap?: () => void;
}

export function StepperInput({
  value,
  onChange,
  step,
  min = 0,
  placeholder = "0",
  inputMode = "numeric",
  prevHint,
  onPrevTap,
}: StepperInputProps) {
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const startLongPressWithRef = useCallback(
    (direction: 1 | -1) => {
      timeoutRef.current = window.setTimeout(() => {
        intervalRef.current = window.setInterval(() => {
          const next = Math.max(min, valueRef.current + step * direction);
          valueRef.current = next;
          onChange(next);
        }, 100);
      }, 400);
    },
    [onChange, step, min],
  );

  const handleStep = (direction: 1 | -1) => {
    const next = Math.max(min, (value || 0) + step * direction);
    onChange(next);
  };

  const selectAllOnFocus = (e: React.FocusEvent<HTMLInputElement>) =>
    e.target.select();

  return (
    <div className="flex flex-col gap-1">
      <div className="input-shell flex items-center overflow-hidden">
        <button
          onClick={() => handleStep(-1)}
          onTouchStart={() => startLongPressWithRef(-1)}
          onTouchEnd={clearTimers}
          onTouchCancel={clearTimers}
          onMouseDown={() => startLongPressWithRef(-1)}
          onMouseUp={clearTimers}
          onMouseLeave={clearTimers}
          className="touch-target flex h-11 w-9 shrink-0 items-center justify-center border-r border-white/[0.06] bg-white/[0.02] text-text-muted transition-colors active:bg-white/[0.08]"
          aria-label="Decrease"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-3 w-3"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
        <input
          type="number"
          inputMode={inputMode}
          value={value || ""}
          onChange={(e) => {
            const parsed =
              inputMode === "decimal"
                ? parseFloat(e.target.value) || 0
                : parseInt(e.target.value) || 0;
            onChange(parsed);
          }}
          onFocus={selectAllOnFocus}
          className="input-focus h-11 w-full min-w-0 border-0 bg-transparent px-1 text-center text-[15px] font-semibold tabular-nums text-white outline-none"
          placeholder={placeholder}
        />
        <button
          onClick={() => handleStep(1)}
          onTouchStart={() => startLongPressWithRef(1)}
          onTouchEnd={clearTimers}
          onTouchCancel={clearTimers}
          onMouseDown={() => startLongPressWithRef(1)}
          onMouseUp={clearTimers}
          onMouseLeave={clearTimers}
          className="touch-target flex h-11 w-9 shrink-0 items-center justify-center border-l border-white/[0.06] bg-white/[0.02] text-text-muted transition-colors active:bg-white/[0.08]"
          aria-label="Increase"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-3 w-3"
          >
            <path d="M12 5v14m7-7H5" />
          </svg>
        </button>
      </div>
      {prevHint && (
        <button
          onClick={onPrevTap}
          className="self-center rounded-full bg-white/[0.04] px-2.5 py-1 text-center text-[10px] font-medium tabular-nums text-text-dim transition-colors active:bg-white/[0.07] active:text-text-muted"
        >
          {prevHint}
        </button>
      )}
    </div>
  );
}
