import { useEffect } from 'react'

// Keeps the screen awake while `active` is true, so the phone doesn't auto-lock and pause
// the page mid-rest. The browser drops the lock whenever the page is hidden, so it is
// requested again each time the page becomes visible. iOS grants the first lock only
// right after a tap (e.g. not for a rest restored after a reload), so any tap retries.
// No-op where unsupported; iOS home-screen apps need iOS 18.4+.
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

    const onTap = () => {
      void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisibilityChange)
    document.addEventListener('click', onTap, true)
    document.addEventListener('touchend', onTap, true)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.removeEventListener('click', onTap, true)
      document.removeEventListener('touchend', onTap, true)
      sentinel?.release().catch(() => {})
    }
  }, [active])
}
