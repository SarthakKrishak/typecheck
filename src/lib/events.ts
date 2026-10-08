/** Emit typing tick for HealthNudge tracking. Called from TypingArea timer. */
export function emitTypingTick(seconds: number) {
  try { window.dispatchEvent(new CustomEvent("typecraft-tick", { detail: { seconds } })); } catch {}
}

export type LiveStats = { wpm: number; raw: number; acc: number; left: number | null };

let liveChannel: BroadcastChannel | null = null;
function getLiveChannel(): BroadcastChannel | null {
  try {
    if (liveChannel) return liveChannel;
    liveChannel = new BroadcastChannel("typecraft-live");
    return liveChannel;
  } catch { return null; }
}

/** Broadcast live stats to the /overlay window (OBS) AND same-tab listeners. */
export function emitLiveStats(detail: LiveStats) {
  try { window.dispatchEvent(new CustomEvent("typecraft-live", { detail })); } catch {}
  try { getLiveChannel()?.postMessage(detail); } catch {}
}
