/** Emit typing tick for HealthNudge tracking. Called from TypingArea timer. */
export function emitTypingTick(seconds: number) {
  try { window.dispatchEvent(new CustomEvent("typecraft-tick", { detail: { seconds } })); } catch {}
}
