// ─────────────────────────────────────────────────────────────────────────────
// Singleton AudioContext manager
// The context MUST be created + resumed inside a user-gesture call stack.
// After that it stays 'running' and can be used from any async context (socket).
// ─────────────────────────────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;
let _unlocked = false;   // true after owner clicks "Enable Sound Alerts"

/**
 * Is audio fully armed and ready?
 */
export function isAudioUnlocked(): boolean {
  return _unlocked && _ctx !== null && _ctx.state === 'running';
}

/**
 * Returns the shared AudioContext, creating it on first call.
 */
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new Ctor();
  }
  return _ctx;
}

/**
 * MUST be called synchronously inside a user click/touch handler.
 *
 * Plays a tiny inaudible buffer which is the only reliable way to move
 * AudioContext from 'suspended' → 'running' across all browsers.
 * After this call, socket-triggered audio works without further user gestures.
 */
export function unlockAudioContext(): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;

    const unlock = () => {
      // Play an inaudible (zero-length, zero-gain) buffer to truly arm the context
      const buffer = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 0.001; // nearly silent
      src.buffer = buffer;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(0);
      _unlocked = true;
    };

    if (ctx.state === 'running') {
      unlock();
    } else {
      ctx.resume().then(() => {
        unlock();
      }).catch(() => {});
    }
  } catch (_) {}
}

// ── Chime synthesis ───────────────────────────────────────────────────────────

function playChimeBurst(ctx: AudioContext): void {
  const now = ctx.currentTime;
  // 4-note bell sequence: D6 → A5 → D6 → A5
  const notes = [1174.66, 880, 1174.66, 880];
  notes.forEach((freq, i) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = now + i * 0.17;
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.44);
    } catch (_) {}
  });
}

/**
 * Play a short confirmation beep. Call directly from a click handler.
 */
export function playConfirmBeep(): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.24);
  } catch (_) {}
}

/**
 * Plays a 15-second staff call ringtone (chime every 1.1s).
 * Works reliably from any context (including WebSocket callbacks)
 * AFTER unlockAudioContext() has been called from a user gesture.
 *
 * Returns a stop() function.
 */
export function startStaffCallRingtone(durationMs = 15_000): () => void {
  let stopped = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    stopped = true;
    if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
    if (timeoutId !== null) { clearTimeout(timeoutId); timeoutId = null; }
  };

  const run = (ctx: AudioContext) => {
    playChimeBurst(ctx);
    intervalId = setInterval(() => {
      if (stopped || ctx.state === 'closed') return;
      playChimeBurst(ctx);
    }, 1100);
    timeoutId = setTimeout(stop, durationMs);
  };

  try {
    const ctx = getCtx();
    if (!ctx) return stop;

    if (ctx.state === 'running') {
      run(ctx);
    } else {
      // Context suspended — attempt resume (works only if called from user gesture)
      ctx.resume().then(() => {
        if (!stopped) run(ctx);
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('startStaffCallRingtone error:', err);
  }

  return stop;
}
