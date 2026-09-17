/** Audio and haptic feedback for the rest timer. Fails silently when blocked. */

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!audioContext) audioContext = new Ctor();
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

/** Browsers need a user gesture before audio will play; call this on first tap. */
export function primeAudio(): void {
  getContext();
}

export function beep(frequency = 880, durationMs = 160, volume = 0.25): void {
  const context = getContext();
  if (!context) return;
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(volume, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + durationMs / 1000);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + durationMs / 1000 + 0.02);
  } catch {
    // Ignore: audio is a nicety, not a requirement.
  }
}

export function countdownBeep(): void {
  beep(660, 110, 0.18);
}

export function finishChime(): void {
  beep(880, 180, 0.3);
  window.setTimeout(() => beep(1180, 260, 0.3), 190);
}

export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // Not supported, nothing to do.
  }
}
