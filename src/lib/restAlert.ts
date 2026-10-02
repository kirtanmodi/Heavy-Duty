// Rest-over alert: beeps through one shared AudioContext plus a vibration where supported.
// iOS keeps an AudioContext created outside a tap suspended, so a context made when the
// timer ends never makes a sound. primeRestAlert() unlocks the shared context during the
// tap that starts the rest; playRestAlert() reuses it when the rest ends.

const RESUME_TIMEOUT_MS = 1000

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext
  const AudioContextClass =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return null
  try {
    audioContext = new AudioContextClass()
  } catch {
    return null
  }
  return audioContext
}

// Call from a tap handler (completing a set, a rest preset, any tap during rest) so the
// alert can play later. Cheap no-op once the context is running.
export function primeRestAlert() {
  const ctx = getAudioContext()
  if (!ctx || ctx.state === 'running') return
  ctx.resume().catch(() => {})
  try {
    // A one-sample silent buffer started inside the tap fully unlocks output on iOS.
    const source = ctx.createBufferSource()
    source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    source.connect(ctx.destination)
    source.start()
  } catch { /* audio not available */ }
}

function playBeeps(ctx: AudioContext) {
  const playBeep = (time: number, freq: number, duration: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration)
    osc.start(time)
    osc.stop(time + duration)
  }
  const now = ctx.currentTime
  playBeep(now, 880, 0.15)
  playBeep(now + 0.18, 880, 0.15)
  playBeep(now + 0.36, 1174.66, 0.3)
}

export function playRestAlert({ sound }: { sound: boolean }) {
  // Android only: iOS Safari has no vibration API.
  if (typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([200, 100, 200])
    } catch { /* vibration blocked */ }
  }
  if (!sound) return
  const ctx = getAudioContext()
  if (!ctx) return
  try {
    if (ctx.state === 'running') {
      playBeeps(ctx)
      return
    }
    // Without a tap WebKit leaves resume() pending until the next tap, which would play
    // this alert as the next rest starts — only beep if it resumes right away.
    const requestedAt = performance.now()
    ctx.resume().then(() => {
      if (performance.now() - requestedAt < RESUME_TIMEOUT_MS) playBeeps(ctx)
    }).catch(() => {})
  } catch { /* audio not available */ }
}
