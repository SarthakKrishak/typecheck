import { useRef, useState, useEffect } from "react";
import { useHistoryStore } from "../store/useHistoryStore";
import { useDailyStore } from "../store/useDailyStore";

// Typecheck Wrapped — pixel-faithful FUT card matching the reference image exactly.
// Rating = BEST WPM. Tiers: BRONZE <45 | SILVER 45+ | GOLD 65+ | RED 85+ | ICON 100+

interface Tier {
  label: string;
  bgTop: string; bgMid: string; bgBot: string;
  ink: string; sub: string; accent: string; frame: string;
  rayColor: string;
}

function tier(wpm: number): Tier {
  if (wpm >= 100) return { label: "ICON", bgTop: "#f0ede6", bgMid: "#d6d2c4", bgBot: "#b0aca0", ink: "#1a1810", sub: "#5a5850", accent: "#8B7355", frame: "#9a9078", rayColor: "rgba(160,150,120,0.10)" };
  if (wpm >= 85) return { label: "TOTY", bgTop: "#2a1008", bgMid: "#5a1c12", bgBot: "#300e06", ink: "#ffe8dc", sub: "#c89a88", accent: "#ff6b4a", frame: "#ff4444", rayColor: "rgba(255,80,60,0.08)" };
  if (wpm >= 65) return { label: "GOLD", bgTop: "#eed888", bgMid: "#d4af37", bgBot: "#b09430", ink: "#1e1800", sub: "#6a5518", accent: "#8B6914", frame: "#9a7d20", rayColor: "rgba(150,115,25,0.10)" };
  if (wpm >= 45) return { label: "SILVER", bgTop: "#e0e0e4", bgMid: "#bcbcC4", bgBot: "#9a9aa2", ink: "#1a1a20", sub: "#5a5a62", accent: "#585862", frame: "#787880", rayColor: "rgba(90,90,100,0.08)" };
  return { label: "BRONZE", bgTop: "#dc9a6a", bgMid: "#ba7538", bgBot: "#8f5c2e", ink: "#241408", sub: "#6a4020", accent: "#7a4520", frame: "#96602e", rayColor: "rgba(110,65,25,0.09)" };
}

export function Wrapped() {
  const history = useHistoryStore((s) => s.results);
  const dailyStreak = useDailyStore((s) => s.streak);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(() => {
    try { return localStorage.getItem("typecraft_card_name") || ""; } catch { return ""; }
  });

  useEffect(() => {
    try { localStorage.setItem("typecraft_card_name", name); } catch {}
  }, [name]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => requestAnimationFrame(() => draw()));
  }, [open, name]);

  function compute() {
    const runs = history.slice(0, 50);
    const best = Math.max(...history.map((h) => h.wpm), 0);
    const bestRun = history.reduce((a, b) => (b.wpm > (a?.wpm ?? 0) ? b : a), history[0]);
    const avgWpm = runs.length ? Math.round(runs.reduce((a, b) => a + b.wpm, 0) / runs.length) : 0;
    const avgAcc = runs.length ? Math.round(runs.reduce((a, b) => a + b.accuracy, 0) / runs.length) : 0;
    const avgCons = runs.length ? Math.round(runs.reduce((a, b) => a + b.consistency, 0) / runs.length) : 0;
    const burst = Math.max(...runs.map((r) => r.burst || r.wpm), 0);
    const totalMin = Math.round(history.reduce((a, b) => a + b.time, 0) / 60);
    const totalChars = history.reduce((a, b) => a + b.correctChars, 0);
    return { best, bestRun, avgWpm, avgAcc, avgCons, burst, totalMin, totalChars };
  }

  function draw() {
    const d = compute();
    const t = tier(d.best);
    const W = 1024; const H = 1456;
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d");
    if (!x) return;
    const mono = "'Geist Mono', ui-monospace, monospace";
    const sans = "'Instrument Sans', sans-serif";
    const displayName = (name.trim() || "PLAYER").toUpperCase();

    x.clearRect(0, 0, W, H);
    x.textBaseline = "top";

    // ════════ CARD SHAPE — exact FUT shield/badge silhouette ════════
    const card = new Path2D();
    // Top edge with small rounded corners
    card.moveTo(48, 0);
    card.lineTo(W - 48, 0);
    card.quadraticCurveTo(W, 0, W, 48);
    // Right side straight down to ~72%
    card.lineTo(W, H * 0.72);
    // Bottom-right curve inward
    card.bezierCurveTo(W, H * 0.84, W * 0.78, H * 0.93, W / 2 + 30, H - 28);
    // Bottom center point (rounded)
    card.quadraticCurveTo(W / 2, H - 8, W / 2 - 30, H - 28);
    // Bottom-left curve outward
    card.bezierCurveTo(W * 0.22, H * 0.93, 0, H * 0.84, 0, H * 0.72);
    // Left side straight up
    card.lineTo(0, 48);
    // Top-left rounded corner
    card.quadraticCurveTo(0, 0, 48, 0);
    card.closePath();

    // ── Metallic gradient background ──
    const gBg = x.createLinearGradient(0, 0, W * 0.3, H);
    gBg.addColorStop(0, t.bgTop);
    gBg.addColorStop(0.5, t.bgMid);
    gBg.addColorStop(1, t.bgBot);
    x.fillStyle = gBg;
    x.fill(card);

    // ── Clip everything to card shape ──
    x.save();
    x.clip(card);

    // ── Subtle diagonal pattern lines (FUT texture) ──
    x.globalAlpha = 1;
    x.strokeStyle = t.rayColor;
    x.lineWidth = 1;
    for (let i = -8; i < 24; i++) {
      x.beginPath();
      x.moveTo(i * 80, -50);
      x.lineTo(i * 80 + 300, H + 50);
      x.stroke();
    }

    // ── Sheen highlight top ──
    const sheen = x.createLinearGradient(0, 0, 0, H * 0.5);
    sheen.addColorStop(0, "rgba(255,255,255,0.18)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = sheen;
    x.fillRect(0, 0, W, H * 0.5);

    // ═══ PHOTO CIRCLE — upper right, circular masked rhythm waveform ═══
    const photoCx = W * 0.66;
    const photoCy = H * 0.26;
    const photoR = W * 0.24;

    // photo circle backdrop
    const photoGrad = x.createRadialGradient(photoCx, photoCy, photoR * 0.2, photoCx, photoCy, photoR);
    photoGrad.addColorStop(0, t.accent);
    photoGrad.addColorStop(1, hexA(t.bgBot, 0.9));
    x.beginPath(); x.arc(photoCx, photoCy, photoR, 0, Math.PI * 2);
    x.fillStyle = photoGrad; x.fill();

    // waveform inside circle (clipped to circle)
    x.save();
    x.beginPath(); x.arc(photoCx, photoCy, photoR - 6, 0, Math.PI * 2);
    x.clip();
    if (d.bestRun && d.bestRun.wpmHistory && d.bestRun.wpmHistory.length > 2) {
      const wave = d.bestRun.wpmHistory.slice(-28);
      const maxV = Math.max(...wave, 1);
      const wx = photoCx - photoR + 14;
      const wy = photoCy - photoR * 0.4;
      const ww = photoR * 2 - 28;
      const wh = photoR * 0.9;
      // grid
      x.strokeStyle = hexA(t.ink, 0.08); x.lineWidth = 1;
      for (let gy = 0; gy <= 3; gy++) {
        x.beginPath(); x.moveTo(wx, wy + (gy / 3) * wh); x.lineTo(wx + ww, wy + (gy / 3) * wh); x.stroke();
      }
      // wave
      x.beginPath();
      wave.forEach((w, i) => {
        const px = wx + (i / (wave.length - 1)) * ww;
        const py = wy + wh - (w / maxV) * (wh - 16) - 8;
        i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      });
      x.strokeStyle = t.ink; x.lineWidth = 5; x.lineJoin = "round"; x.stroke();
      x.lineTo(wx + ww, wy + wh); x.lineTo(wx, wy + wh); x.closePath();
      x.fillStyle = hexA(t.ink, 0.1); x.fill();
    }
    x.restore(); // unclip waveform

    // photo circle border
    x.beginPath(); x.arc(photoCx, photoCy, photoR, 0, Math.PI * 2);
    x.strokeStyle = hexA(t.ink, 0.2); x.lineWidth = 2; x.stroke();

    // ═══ RATING — top-left, large bold ═══
    x.textBaseline = "top"; x.textAlign = "left";
    x.fillStyle = t.ink;
    x.font = `900 120px ${mono}`;
    x.fillText(String(d.best), 72, 72);

    // ═══ POSITION — below rating ═══
    x.font = `800 38px ${mono}`;
    x.fillStyle = t.ink;
    x.fillText("TYP", 74, 210);

    // ═══ FLAG — small rect with accent ═══
    const flagY = 272;
    x.fillStyle = t.accent;
    x.fillRect(74, flagY, 56, 38);
    x.strokeStyle = hexA(t.ink, 0.3); x.lineWidth = 1; x.strokeRect(74, flagY, 56, 38);
    // stripe detail
    x.fillStyle = hexA(t.ink, 0.3);
    x.fillRect(74, flagY + 12, 56, 3);
    x.fillRect(74, flagY + 24, 56, 3);

    // ═══ CLUB BADGE — below flag, rounded rect with "TC" ═══
    const badgeY = flagY + 54;
    x.fillStyle = hexA(t.ink, 0.12);
    x.beginPath(); x.roundRect(74, badgeY, 56, 42, 6); x.fill();
    x.strokeStyle = hexA(t.ink, 0.3); x.lineWidth = 1; x.stroke();
    x.fillStyle = t.ink;
    x.font = `800 20px ${mono}`;
    x.textAlign = "center";
    x.fillText("TC", 102, badgeY + 10);
    x.textAlign = "left";

    // ═══ HORIZONTAL DIVIDER above name ═══
    const div1Y = H * 0.55;
    x.strokeStyle = hexA(t.ink, 0.25); x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(60, div1Y); x.lineTo(W - 60, div1Y); x.stroke();

    // ═══ PLAYER NAME — centered, bold, large ═══
    const nameY = div1Y + 22;
    x.textAlign = "center";
    x.fillStyle = t.ink;
    x.font = `800 52px ${mono}`;
    x.fillText(displayName, W / 2, nameY);

    // ═══ HORIZONTAL DIVIDER below name ═══
    const div2Y = nameY + 78;
    x.strokeStyle = hexA(t.ink, 0.25); x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(120, div2Y); x.lineTo(W - 120, div2Y); x.stroke();

    // ═══ STATS — 2 cols × 3 rows, real product metrics ═══
    const statsLeft: Array<[string, string]> = [
      ["WPM", String(d.avgWpm)],
      ["ACC", `${d.avgAcc}%`],
      ["CONS", `${d.avgCons}%`],
    ];
    const statsRight: Array<[string, string]> = [
      ["PEAK", String(d.burst)],
      ["STREAK", String(dailyStreak)],
      ["TIME", `${d.totalMin}m`],
    ];
    const statStartY = div2Y + 30;
    const statRowH = 82;
    const leftColX = W * 0.16;
    const rightColX = W * 0.56;

    // vertical divider between columns
    const vDivX = W / 2;
    x.strokeStyle = hexA(t.ink, 0.15); x.lineWidth = 1;
    x.beginPath(); x.moveTo(vDivX, statStartY - 8); x.lineTo(vDivX, statStartY + statRowH * 2 + 56); x.stroke();

    // draw stat pairs — value bold white, label lighter
    const drawStat = (sx: number, sy: number, val: string, label: string) => {
      x.textAlign = "left";
      // value — bold white
      x.font = `800 48px ${mono}`;
      x.fillStyle = "#FFFFFF";
      x.fillText(val, sx, sy);
      const vw = x.measureText(val).width;
      // label — smaller, muted
      x.font = `600 26px ${sans}`;
      x.fillStyle = hexA(t.ink, 0.6);
      x.fillText(label, sx + vw + 12, sy + 12);
    };

    statsLeft.forEach(([label, val], i) => {
      drawStat(leftColX, statStartY + i * statRowH, val, label);
    });
    statsRight.forEach(([label, val], i) => {
      drawStat(rightColX, statStartY + i * statRowH, val, label);
    });

    // ═══ BOTTOM BRAND MARK — small line ═══
    const brandY = statStartY + statRowH * 2 + 76;
    x.strokeStyle = hexA(t.ink, 0.3); x.lineWidth = 2;
    x.beginPath(); x.moveTo(W / 2 - 30, brandY); x.lineTo(W / 2 + 30, brandY); x.stroke();

    x.restore(); // unclip card

    // ═══ OUTER CARD BORDER — subtle stroke on the shape ═══
    x.strokeStyle = hexA(t.frame, 0.4);
    x.lineWidth = 2;
    x.stroke(card);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="h-7 px-3 rounded-md text-[11px] font-semibold tracking-wide inline-flex items-center border" style={{ background: "linear-gradient(160deg,#E8C468,#B8912F)", color: "#17131a", borderColor: "#E8C468" }}>
        WRAPPED
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.74)" }} />
          <div className="relative rounded-xl border overflow-hidden animate-[fadeIn_0.2s_ease]" style={{ background: "var(--bg-surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 12).toUpperCase())}
                placeholder="YOUR NAME"
                className="w-[140px] h-7 rounded-md border px-2 text-[12px] font-mono uppercase tracking-widest outline-none"
                style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }}
              />
              <div className="flex gap-2 ml-auto">
                <button onClick={() => { const a = document.createElement("a"); a.download = `typecraft-fut-${Date.now()}.png`; a.href = canvasRef.current!.toDataURL("image/png"); a.click(); }} className="h-7 px-3 rounded-md text-[11px] font-semibold" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>Save PNG</button>
                <button onClick={() => { const dd = compute(); navigator.clipboard.writeText(`${dd.best} WPM — my typecheck FUT card`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }} className="h-7 px-3 rounded-md text-[11px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>{copied ? "Copied" : "Share"}</button>
                <button onClick={() => setOpen(false)} className="h-7 w-7 rounded-md border text-[12px]" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>×</button>
              </div>
            </div>
            <canvas ref={canvasRef} className="block max-h-[72vh] w-auto" />
          </div>
        </div>
      )}
    </>
  );
}

function hexA(hex: string, alpha: number): string {
  if (hex.startsWith("rgba")) return hex;
  if (hex.startsWith("rgb")) return hex.replace("rgb(", "rgba(").replace(")", `,${alpha})`);
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
