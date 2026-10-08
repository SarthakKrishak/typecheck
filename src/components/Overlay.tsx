import { useEffect, useState } from "react";

// Streamer overlay — mount at /overlay for OBS browser source (transparent bg).
// Listens on BroadcastChannel so it works cross-window (OBS source),
// with same-tab CustomEvent as fallback.
export function OverlayView() {
  const [live, setLive] = useState({ wpm: 0, raw: 0, acc: 100, left: null as number | null });
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    const apply = (detail: unknown) => {
      const d = detail as Partial<{ wpm: number; raw: number; acc: number; left: number | null }>;
      if (!d || typeof d !== "object") return;
      setLive((prev) => ({
        wpm: Number.isFinite(d.wpm) ? (d.wpm as number) : prev.wpm,
        raw: Number.isFinite(d.raw) ? (d.raw as number) : prev.raw,
        acc: Number.isFinite(d.acc) ? (d.acc as number) : prev.acc,
        left: d.left === null || d.left === undefined || Number.isFinite(d.left) ? (d.left as number | null) : prev.left,
      }));
    };
    const onLive = (e: Event) => apply((e as CustomEvent).detail);
    window.addEventListener("typecraft-live", onLive);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("typecraft-live");
      bc.onmessage = (e) => apply(e.data);
    } catch {}
    return () => { window.removeEventListener("typecraft-live", onLive); try { bc?.close(); } catch {} };
  }, []);
  return (
    <div className="inline-flex items-center gap-4 px-5 py-3 rounded-xl" style={{ background: "rgba(10,10,11,0.82)", border: "1px solid rgba(94,106,210,0.4)", backdropFilter: "blur(8px)" }}>
      <div className="text-center">
        <div className="font-mono text-[34px] font-bold leading-none" style={{ color: "#818CF8" }}>{live.wpm}</div>
        <div className="text-[9px] tracking-widest uppercase mt-1" style={{ color: "#8A8F98" }}>WPM</div>
      </div>
      <div className="w-px h-9" style={{ background: "rgba(255,255,255,0.12)" }} />
      <div className="text-center">
        <div className="font-mono text-[22px] font-bold leading-none" style={{ color: "#EDEEF0" }}>{live.acc}%</div>
        <div className="text-[9px] tracking-widest uppercase mt-1" style={{ color: "#8A8F98" }}>ACC</div>
      </div>
      {live.left !== null && (
        <>
          <div className="w-px h-9" style={{ background: "rgba(255,255,255,0.12)" }} />
          <div className="text-center">
            <div className="font-mono text-[22px] font-bold leading-none" style={{ color: "#EDEEF0" }}>{live.left}s</div>
            <div className="text-[9px] tracking-widest uppercase mt-1" style={{ color: "#8A8F98" }}>LEFT</div>
          </div>
        </>
      )}
      <span className="font-mono text-[10px] ml-1" style={{ color: "#52525B" }}>typecheck</span>
    </div>
  );
}
