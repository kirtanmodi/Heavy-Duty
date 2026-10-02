import { useEffect } from 'react'

// Keeps the screen awake while `active` is true, so the phone doesn't auto-lock and pause
// the page mid-rest. The browser drops the lock whenever the page is hidden, so it is
// requested again each time the page becomes visible. No-op where unsupported.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let requesting = false
    let disposed = false

    const request = async () => {
      if (disposed || requesting || document.visibilityState !== 'visible') return
      if (sentinel && !sentinel.released) return
      requesting = true
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (disposed) lock.release().catch(() => {})
        else sentinel = lock
      } catch {
        // Denied (e.g. battery saver) — the timer still works, the screen may just lock.
      } finally {
        requesting = false
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sentinel?.release().catch(() => {})
    }
  }, [active])
}
