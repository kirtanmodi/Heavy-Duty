import { useState, useRef, useCallback, useEffect } from 'react'

interface RunningTimer {
  /** Wall-clock time (ms) when the rest ends */
  endsAt: number
  /** Length of this rest, for the progress bar */
  seconds: number
  label: string
}

/**
 * Rest timer keyed to a wall-clock deadline, so it stays correct when the phone
 * locks or the app is in the background. It keeps no per-second state: the
 * owner re-renders only on start and stop. Show the time left with
 * useCountdown in a small child component.
 */
export function useTimer(onComplete?: () => void) {
  const [running, setRunning] = useState<RunningTimer | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const clearPending = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clearPending()
    setRunning(null)
  }, [clearPending])

  const start = useCallback((seconds: number, label = 'Rest') => {
    clearPending()
    setRunning({ endsAt: Date.now() + seconds * 1000, seconds, label })
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      setRunning(null)
      onCompleteRef.current?.()
    }, seconds * 1000)
  }, [clearPending])

  useEffect(() => clearPending, [clearPending])

  return {
    isRunning: running !== null,
    endsAt: running?.endsAt ?? null,
    seconds: running?.seconds ?? 0,
    label: running?.label ?? '',
    start,
    stop,
  }
}

/** Whole seconds left until `endsAt`. Wakes once per second, on the second boundary. */
export function useCountdown(endsAt: number) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))

  useEffect(() => {
    let id: number | undefined
    const tick = () => {
      const msLeft = endsAt - Date.now()
      setSecondsLeft(Math.max(0, Math.ceil(msLeft / 1000)))
      if (msLeft > 0) id = window.setTimeout(tick, msLeft % 1000 || 1000)
    }
    tick()
    return () => clearTimeout(id)
  }, [endsAt])

  return secondsLeft
}
