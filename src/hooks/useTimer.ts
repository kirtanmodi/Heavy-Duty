import { useState, useRef, useCallback, useEffect } from 'react'

// Countdown keyed to an end timestamp, not a tick count: phones pause the page while
// locked or in the background, so counting ticks would resume from where it froze.
// With a persistKey, a running countdown is saved and restored if the page reloads
// (iOS often kills a backgrounded app). onComplete receives how late the end was
// noticed, e.g. when the user returns to the app after the time ran out.

const STORAGE_KEY = 'hd_rest_timer'
const TICK_MS = 250

interface RunningTimer {
  endsAt: number
  label: string
}

interface StoredTimer extends RunningTimer {
  key: string
}

export interface TimerCompleteInfo {
  lateMs: number
}

function readStoredTimer(persistKey: string | null | undefined): RunningTimer | null {
  if (!persistKey) return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<StoredTimer>
    if (stored.key !== persistKey || typeof stored.endsAt !== 'number' || typeof stored.label !== 'string') {
      return null
    }
    // Ran out while the app was closed — nothing left to count down.
    if (stored.endsAt <= Date.now()) return null
    return { endsAt: stored.endsAt, label: stored.label }
  } catch {
    return null
  }
}

function writeStoredTimer(stored: StoredTimer | null) {
  try {
    if (stored) localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    else localStorage.removeItem(STORAGE_KEY)
  } catch { /* storage unavailable */ }
}

export function useTimer(onComplete?: (info: TimerCompleteInfo) => void, persistKey?: string | null) {
  const [timer, setTimer] = useState<RunningTimer | null>(() => readStoredTimer(persistKey))
  const [now, setNow] = useState(() => Date.now())
  const onCompleteRef = useRef(onComplete)
  const persistKeyRef = useRef(persistKey)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    persistKeyRef.current = persistKey
  }, [persistKey])

  const stop = useCallback(() => {
    setTimer(null)
    writeStoredTimer(null)
  }, [])

  const start = useCallback((seconds: number, timerLabel = 'REST BETWEEN EXERCISES') => {
    const startedAt = Date.now()
    const next = { endsAt: startedAt + seconds * 1000, label: timerLabel }
    setNow(startedAt)
    setTimer(next)
    const key = persistKeyRef.current
    writeStoredTimer(key ? { ...next, key } : null)
  }, [])

  useEffect(() => {
    if (!timer) return
    let completed = false
    const tick = () => {
      if (completed) return
      const current = Date.now()
      if (current < timer.endsAt) {
        setNow(current)
        return
      }
      completed = true
      setTimer(null)
      writeStoredTimer(null)
      onCompleteRef.current?.({ lateMs: current - timer.endsAt })
    }
    // Catch up as soon as the page is shown again instead of waiting for the next tick.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick()
    }
    const intervalId = window.setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pageshow', tick)
    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pageshow', tick)
    }
  }, [timer])

  const secondsLeft = timer ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : 0

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return { secondsLeft, isRunning: timer !== null, label: timer?.label ?? '', start, stop, formatTime }
}
