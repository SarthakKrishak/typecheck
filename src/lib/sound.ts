let ctx: AudioContext | null = null;
let keyBuf: AudioBuffer | null = null;
let errBuf: AudioBuffer | null = null;
let correctBuf: AudioBuffer | null = null;
let htmlKey: HTMLAudioElement | null = null;
let htmlCorrect: HTMLAudioElement | null = null;
let htmlErr: HTMLAudioElement | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  try {
    const Ctx = (window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext: typeof AudioContext }).AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctx();
    return ctx;
  } catch { return null; }
}

// Preload real mechanical samples for zero-delay playback
async function preloadBuffers() {
  const c = getCtx(); if (!c) return;
  const load = async (url: string) => {
    try {
      const r = await fetch(url);
      const ab = await r.arrayBuffer();
      return await c.decodeAudioData(ab.slice(0));
    } catch { return null; }
  };
  const [k, e, cr] = await Promise.all([
    load("/sounds/mech-key.wav"),
    load("/sounds/mech-key-error.wav"),
    load("/sounds/correct-pop.wav"),
  ]);
  if (k) keyBuf = k;
  if (e) errBuf = e;
  if (cr) correctBuf = cr;
}

// HTMLAudio fallback (instant, no decode needed) — also preloaded, reduced volume as requested
function preloadHtml() {
  try {
    htmlKey = new Audio("/sounds/mech-key.wav");
    htmlKey.preload = "auto"; htmlKey.volume = 0.32;
    htmlErr = new Audio("/sounds/mech-key-error.wav");
    htmlErr.preload = "auto"; htmlErr.volume = 0.30;
    htmlCorrect = new Audio("/sounds/correct-pop.wav");
    htmlCorrect.preload = "auto"; htmlCorrect.volume = 0.36;
    // force load
    htmlKey.load(); htmlErr.load(); htmlCorrect.load();
  } catch {}
}

if (typeof window !== "undefined") {
  // warm immediately and on first interaction
  preloadHtml();
  preloadBuffers();
  const warm = () => {
    const c = getCtx();
    if (c && c.state === "suspended") c.resume();
    unlocked = true;
    // also unlock HTMLAudio by brief play
    [htmlKey, htmlCorrect, htmlErr].forEach((a) => {
      if (!a) return;
      a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
    });
    window.removeEventListener("pointerdown", warm);
    window.removeEventListener("keydown", warm);
    window.removeEventListener("touchstart", warm);
  };
  window.addEventListener("pointerdown", warm, { once: true });
  window.addEventListener("keydown", warm, { once: true });
  window.addEventListener("touchstart", warm, { once: true });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") getCtx(); });
}

function playBuffer(buf: AudioBuffer | null, vol: number) {
  const c = getCtx(); if (!c || !buf) return false;
  if (c.state === "suspended") c.resume();
  try {
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(g); g.connect(c.destination);
    src.start(c.currentTime + 0.002);
    return true;
  } catch { return false; }
}

function playHtml(a: HTMLAudioElement | null) {
  if (!a) return false;
  try {
    const clone = a.cloneNode(true) as HTMLAudioElement;
    clone.volume = a.volume;
    clone.currentTime = 0;
    clone.play().catch(() => {});
    return true;
  } catch { return false; }
}

// Satisfying mechanical — real sample, thocky, reduced volume per request
export function playMechanical(ok: boolean) {
  // try WebAudio buffer first (lowest latency, polyphonic), fallback to HTMLAudio
  const buf = ok ? keyBuf : errBuf;
  const html = ok ? htmlKey : htmlErr;
  const vol = ok ? 0.42 : 0.38;
  if (buf) {
    if (playBuffer(buf, vol)) return;
  }
  playHtml(html);
  // fallback synth if both fail (should not happen)
  if (!buf && !html) {
    const c = getCtx(); if (!c) return;
    try {
      const t = c.currentTime + 0.002;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "square"; o.frequency.setValueAtTime(ok ? 1800 : 120, t);
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.07);
    } catch {}
  }
}

// Correct-word pop — real sample chord, reduced
export function playCorrectWord() {
  if (correctBuf && playBuffer(correctBuf, 0.48)) return;
  if (playHtml(htmlCorrect)) return;
  // fallback
  const c = getCtx(); if (!c) return;
  try {
    const t = c.currentTime + 0.002;
    [880, 1108.73, 1318.51].forEach((f) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.32);
    });
  } catch {}
}

export function playKeySound(ok: boolean, _isSpace = false) { playMechanical(ok); }
export function playWordCorrectSound() { playCorrectWord(); }
export function playPreview() { playMechanical(true); setTimeout(() => playCorrectWord(), 140); }
export function playPreviewKeys() { playMechanical(true); }
export function playPreviewWord() { playCorrectWord(); }
export function isAudioUnlocked() { return unlocked; }

// Rhythm mode metronome — soft wood-block tick, alternate pitch each beat
export function playMetronome(accent: boolean) {
  const c = getCtx(); if (!c) return;
  if (c.state === "suspended") c.resume();
  try {
    const t = c.currentTime + 0.002;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(accent ? 1200 : 800, t);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.06);
  } catch {}
}
