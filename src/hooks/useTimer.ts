import { useState, useRef, useCallback, useEffect } from 'react'

export function useTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [label, setLabel] = useState('')
  const intervalRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
    setSecondsLeft(0)
    setLabel('')
  }, [])

  const start = useCallback((seconds: number, timerLabel = 'REST BETWEEN EXERCISES') => {
    stop()
    setSecondsLeft(seconds)
    setIsRunning(true)
    setLabel(timerLabel)

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          stop()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [stop])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return { secondsLeft, isRunning, label, start, stop, formatTime }
}
