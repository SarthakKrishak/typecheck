import { useRef, useState, useEffect } from "react";
import { useHistoryStore } from "../store/useHistoryStore";
import { useDailyStore } from "../store/useDailyStore";

// Typecheck Wrapped — exact FIFA FUT card replica
// Rating = BEST WPM. Tiers: BRONZE <45 | SILVER 45+ | GOLD 65+ | TOTY 85+ | ICON 100+

interface Tier {
  label: string;
  bg0: string; bg1: string; bg2: string; bg3: string;
  ink: string; sub: string; accent: string; frame: string;
  ray: string;
}

function tier(wpm: number): Tier {
  if (wpm >= 100) return { label: "ICON", bg0: "#f5f2ea", bg1: "#ddd8ca", bg2: "#c0b8a4", bg3: "#a89e88", ink: "#1a1810", sub: "#6a6458", accent: "#8B7355", frame: "#9a9078", ray: "rgba(160,150,120,0.08)" };
  if (wpm >= 85) return { label: "TOTY", bg0: "#1e0c06", bg1: "#4a1810", bg2: "#2a0e06", bg3: "#180804", ink: "#ffe4d6", sub: "#c89680", accent: "#ff6b4a", frame: "#ff4444", ray: "rgba(255,80,50,0.06)" };
  if (wpm >= 65) return { label: "GOLD", bg0: "#f2dc96", bg1: "#e0bc50", bg2: "#c8a038", bg3: "#a88828", ink: "#1e1800", sub: "#6a5518", accent: "#8B6914", frame: "#9a7d20", ray: "rgba(140,105,20,0.07)" };
  if (wpm >= 45) return { label: "SILVER", bg0: "#e4e4e8", bg1: "#c4c4cc", bg2: "#a4a4ac", bg3: "#88888e", ink: "#1a1a20", sub: "#585862", accent: "#585862", frame: "#787880", ray: "rgba(90,90,100,0.06)" };
  return { label: "BRONZE", bg0: "#e0a070", bg1: "#c07840", bg2: "#9a5c2c", bg3: "#7a4420", ink: "#1e1004", sub: "#6a4020", accent: "#7a4520", frame: "#96602e", ray: "rgba(100,55,20,0.07)" };
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
    return { best, bestRun, avgWpm, avgAcc, avgCons, burst, totalMin };
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

    // ═══ FUT CARD SHAPE — exact silhouette ═══
    const card = new Path2D();
    card.moveTo(56, 0);
    card.lineTo(W - 56, 0);
    card.quadraticCurveTo(W, 0, W, 56);
    card.lineTo(W, H * 0.68);
    card.bezierCurveTo(W, H * 0.82, W * 0.72, H * 0.94, W / 2 + 24, H - 20);
    card.quadraticCurveTo(W / 2, H - 4, W / 2 - 24, H - 20);
    card.bezierCurveTo(W * 0.28, H * 0.94, 0, H * 0.82, 0, H * 0.68);
    card.lineTo(0, 56);
    card.quadraticCurveTo(0, 0, 56, 0);
    card.closePath();

    // ── Metallic gradient (vertical with sheen) ──
    const gBg = x.createLinearGradient(0, 0, 0, H);
    gBg.addColorStop(0, t.bg0);
    gBg.addColorStop(0.3, t.bg1);
    gBg.addColorStop(0.7, t.bg2);
    gBg.addColorStop(1, t.bg3);
    x.fillStyle = gBg;
    x.fill(card);

    // ── Clip to card ──
    x.save();
    x.clip(card);

    // ── Sunburst rays from center of photo area (FUT signature) ──
    const rayCx = W * 0.62;
    const rayCy = H * 0.26;
    x.globalAlpha = 1;
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      x.beginPath();
      x.moveTo(rayCx, rayCy);
      x.lineTo(rayCx + Math.cos(angle) * W * 1.5, rayCy + Math.sin(angle) * H * 1.5);
      x.lineTo(rayCx + Math.cos(angle + 0.045) * W * 1.5, rayCy + Math.sin(angle + 0.045) * H * 1.5);
      x.closePath();
      x.fillStyle = i % 2 === 0 ? t.ray : "transparent";
      x.fill();
    }

    // ── Sheen top-left ──
    const sheen = x.createLinearGradient(0, 0, W * 0.5, H * 0.35);
    sheen.addColorStop(0, "rgba(255,255,255,0.22)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = sheen;
    x.fillRect(0, 0, W * 0.5, H * 0.35);

    // ═══════════════════════════════════════════
    // LEFT COLUMN: rating → position → flag → badge
    // ═══════════════════════════════════════════
    const lx = 82;

    // Rating — huge bold number
    x.textBaseline = "top"; x.textAlign = "left";
    x.fillStyle = t.ink;
    x.font = `900 136px ${mono}`;
    x.fillText(String(d.best), lx, 56);

    // Position "TYP" below
    x.font = `800 36px ${mono}`;
    x.fillText("TYP", lx + 4, 208);

    // ── FLAG: tricolor bars (like a nation flag) ──
    const flagW = 64; const flagH = 44; const flagY = 266;
    // three vertical stripes
    const stripeW = flagW / 3;
    x.fillStyle = t.accent; x.fillRect(lx, flagY, stripeW, flagH);
    x.fillStyle = hexA(t.ink, 0.7); x.fillRect(lx + stripeW, flagY, stripeW, flagH);
    x.fillStyle = hexA(t.ink, 0.3); x.fillRect(lx + stripeW * 2, flagY, stripeW, flagH);
    // border
    x.strokeStyle = hexA(t.ink, 0.3); x.lineWidth = 1;
    x.strokeRect(lx, flagY, flagW, flagH);

    // ── CLUB BADGE: rounded square with "TC" ──
    const badgeSize = 52; const badgeY = flagY + flagH + 16;
    const bgGrad = x.createLinearGradient(lx, badgeY, lx + badgeSize, badgeY + badgeSize);
    bgGrad.addColorStop(0, hexA(t.accent, 0.9)); bgGrad.addColorStop(1, hexA(t.accent, 0.6));
    x.beginPath(); x.roundRect(lx, badgeY, badgeSize, badgeSize, 8);
    x.fillStyle = bgGrad; x.fill();
    x.strokeStyle = hexA(t.ink, 0.25); x.lineWidth = 1.5; x.stroke();
    x.fillStyle = t.ink;
    x.font = `800 22px ${mono}`;
    x.textAlign = "center"; x.textBaseline = "top";
    x.fillText("TC", lx + badgeSize / 2, badgeY + 14);
    x.textAlign = "left"; x.textBaseline = "top";

    // ═══════════════════════════════════════════
    // RIGHT: PLAYER PHOTO — large oval, FUT style
    // ═══════════════════════════════════════════
    const phCx = W * 0.64;
    const phCy = H * 0.24;
    const phRx = W * 0.26;
    const phRy = H * 0.16;

    // outer glow ring
    const og = x.createRadialGradient(phCx, phCy, phRx * 0.5, phCx, phCy, phRx * 1.3);
    og.addColorStop(0, hexA(t.accent, 0.15)); og.addColorStop(1, "transparent");
    x.beginPath(); x.ellipse(phCx, phCy, phRx * 1.3, phRy * 1.3, 0, 0, Math.PI * 2);
    x.fillStyle = og; x.fill();

    // oval clip for photo
    x.save();
    x.beginPath(); x.ellipse(phCx, phCy, phRx, phRy, 0, 0, Math.PI * 2);
    x.clip();

    // dark backdrop inside photo
    const pg = x.createLinearGradient(phCx - phRx, phCy - phRy, phCx + phRx, phCy + phRy);
    pg.addColorStop(0, hexA(t.bg3, 0.95));
    pg.addColorStop(1, hexA(t.bg2, 0.85));
    x.fillStyle = pg;
    x.fillRect(phCx - phRx, phCy - phRy, phRx * 2, phRy * 2);

    // draw waveform as the "portrait"
    if (d.bestRun && d.bestRun.wpmHistory && d.bestRun.wpmHistory.length > 2) {
      const wave = d.bestRun.wpmHistory.slice(-32);
      const maxV = Math.max(...wave, 1);
      const wx = phCx - phRx + 20;
      const wy = phCy - phRy * 0.35;
      const ww = phRx * 2 - 40;
      const wh = phRy * 1.1;

      // grid lines
      x.strokeStyle = hexA(t.ink, 0.06); x.lineWidth = 1;
      for (let gy = 0; gy <= 4; gy++) {
        x.beginPath(); x.moveTo(wx, wy + (gy / 4) * wh); x.lineTo(wx + ww, wy + (gy / 4) * wh); x.stroke();
      }

      // area fill
      x.beginPath();
      wave.forEach((w, i) => {
        const px = wx + (i / (wave.length - 1)) * ww;
        const py = wy + wh - (w / maxV) * (wh - 20) - 10;
        i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      });
      x.lineTo(wx + ww, wy + wh); x.lineTo(wx, wy + wh); x.closePath();
      const wf = x.createLinearGradient(0, wy, 0, wy + wh);
      wf.addColorStop(0, hexA(t.accent, 0.3)); wf.addColorStop(1, hexA(t.accent, 0.03));
      x.fillStyle = wf; x.fill();

      // line on top
      x.beginPath();
      wave.forEach((w, i) => {
        const px = wx + (i / (wave.length - 1)) * ww;
        const py = wy + wh - (w / maxV) * (wh - 20) - 10;
        i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      });
      x.strokeStyle = t.ink; x.lineWidth = 4.5; x.lineJoin = "round"; x.lineCap = "round"; x.stroke();

      // peak marker
      const peakI = wave.indexOf(Math.max(...wave));
      const pkX = wx + (peakI / (wave.length - 1)) * ww;
      const pkY = wy + wh - (Math.max(...wave) / maxV) * (wh - 20) - 10;
      x.beginPath(); x.arc(pkX, pkY, 7, 0, Math.PI * 2);
      x.fillStyle = t.accent; x.fill();
      x.strokeStyle = t.ink; x.lineWidth = 2; x.stroke();
    }
    x.restore(); // unclip photo oval

    // photo border — double ring
    x.beginPath(); x.ellipse(phCx, phCy, phRx, phRy, 0, 0, Math.PI * 2);
    x.strokeStyle = hexA(t.ink, 0.15); x.lineWidth = 3; x.stroke();
    x.beginPath(); x.ellipse(phCx, phCy, phRx + 5, phRy + 5, 0, 0, Math.PI * 2);
    x.strokeStyle = hexA(t.ink, 0.08); x.lineWidth = 1; x.stroke();

    // ═══ HORIZONTAL DIVIDER — separates photo from stats ═══
    const divY = H * 0.48;
    x.strokeStyle = hexA(t.ink, 0.2); x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(56, divY); x.lineTo(W - 56, divY); x.stroke();

    // ═══ PLAYER NAME — centered, bold ═══
    const nameY = divY + 20;
    x.textAlign = "center"; x.textBaseline = "top";
    x.fillStyle = t.ink;
    x.font = `800 54px ${mono}`;
    x.fillText(displayName, W / 2, nameY);

    // ═══ DIVIDER below name ═══
    const div2Y = nameY + 80;
    x.strokeStyle = hexA(t.ink, 0.2); x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(100, div2Y); x.lineTo(W - 100, div2Y); x.stroke();

    // ═══ STATS — 2 cols × 3 rows with vertical divider ═══
    const statsL: Array<[string, string]> = [
      ["WPM", String(d.avgWpm)],
      ["ACC", `${d.avgAcc}%`],
      ["CONS", `${d.avgCons}%`],
    ];
    const statsR: Array<[string, string]> = [
      ["PEAK", String(d.burst)],
      ["STREAK", String(dailyStreak)],
      ["TIME", `${d.totalMin}m`],
    ];
    const stY = div2Y + 28;
    const rowH = 78;
    const lxCol = W * 0.18;
    const rxCol = W * 0.58;

    // vertical divider
    x.strokeStyle = hexA(t.ink, 0.12); x.lineWidth = 1;
    x.beginPath(); x.moveTo(W / 2, stY - 6); x.lineTo(W / 2, stY + rowH * 2 + 52); x.stroke();

    // draw stats — white values, muted labels
    const drawStat = (sx: number, sy: number, val: string, label: string) => {
      x.textAlign = "left"; x.textBaseline = "top";
      x.font = `800 46px ${mono}`;
      x.fillStyle = "#FFFFFF";
      x.fillText(val, sx, sy);
      const vw = x.measureText(val).width;
      x.font = `600 24px ${sans}`;
      x.fillStyle = hexA(t.ink, 0.55);
      x.fillText(label, sx + vw + 10, sy + 12);
    };

    statsL.forEach(([l, v], i) => drawStat(lxCol, stY + i * rowH, v, l));
    statsR.forEach(([l, v], i) => drawStat(rxCol, stY + i * rowH, v, l));

    // ═══ BOTTOM BRAND LINE ═══
    const brandY2 = stY + rowH * 2 + 68;
    x.strokeStyle = hexA(t.ink, 0.25); x.lineWidth = 2;
    x.beginPath(); x.moveTo(W / 2 - 28, brandY2); x.lineTo(W / 2 + 28, brandY2); x.stroke();

    x.restore(); // unclip card

    // ═══ OUTER BORDER ═══
    x.strokeStyle = hexA(t.frame, 0.35);
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
                <button onClick={() => { const a = document.createElement("a"); a.download = `typecheck-fut-${Date.now()}.png`; a.href = canvasRef.current!.toDataURL("image/png"); a.click(); }} className="h-7 px-3 rounded-md text-[11px] font-semibold" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>Save PNG</button>
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
