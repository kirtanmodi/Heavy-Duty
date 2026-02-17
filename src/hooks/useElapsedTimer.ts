import { useState, useEffect } from 'react'

export function useElapsedTimer(startedAt: string | null) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    const start = new Date(startedAt).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    update()
    const id = window.setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`

  return { elapsed, formatted }
}
