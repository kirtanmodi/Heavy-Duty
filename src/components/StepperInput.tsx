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

// Each step button is 36px visually; an invisible ::after widens the hit area to 44px:
// 2px outward (half of the narrowest 4px column gap, so neighbours never overlap) and
// 6px inward over the blank edge of the value field.
const stepButtonClass =
  "relative flex w-9 shrink-0 items-center justify-center text-text-secondary transition-colors active:bg-fill-strong active:text-text-primary after:absolute after:inset-y-0 after:content-['']";

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

  // Shrink long values (e.g. "102.5") so they stay fully visible in narrow columns.
  const valueLength = value ? String(value).length : 0;
  const valueSizeClass =
    valueLength >= 5 ? "text-[13px]" : valueLength === 4 ? "text-[15px]" : "text-[17px]";

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex h-12 items-stretch rounded-[0.875rem] bg-fill transition-shadow focus-within:ring-1 focus-within:ring-white/25">
        <button
          onClick={() => handleStep(-1)}
          onTouchStart={() => startLongPressWithRef(-1)}
          onTouchEnd={clearTimers}
          onTouchCancel={clearTimers}
          onMouseDown={() => startLongPressWithRef(-1)}
          onMouseUp={clearTimers}
          onMouseLeave={clearTimers}
          className={`${stepButtonClass} rounded-l-[0.875rem] after:-left-[2px] after:-right-[6px]`}
          aria-label="Decrease"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="h-4 w-4"
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
          className={`h-full w-full min-w-0 rounded-none border-0 bg-transparent p-0 text-center font-semibold tabular-nums tracking-tight text-text-primary outline-none ${valueSizeClass}`}
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
          className={`${stepButtonClass} rounded-r-[0.875rem] after:-left-[6px] after:-right-[2px]`}
          aria-label="Increase"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <path d="M12 5v14m7-7H5" />
          </svg>
        </button>
      </div>
      {prevHint && (
        <button
          onClick={onPrevTap}
          className="relative min-h-7 w-full rounded-lg px-1 py-1.5 text-center text-[11px] tabular-nums leading-none text-text-muted transition-colors after:absolute after:inset-x-0 after:top-0 after:-bottom-1.5 after:content-[''] active:text-text-primary"
        >
          {prevHint}
        </button>
      )}
    </div>
  );
}
