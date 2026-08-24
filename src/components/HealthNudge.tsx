import { useEffect, useState } from "react";

const POMO_KEY = "typecraft_last_break";
const TOTAL_KEY = "typecraft_total_typing_s";

export function HealthNudge() {
  const [show, setShow] = useState(false);
  const [total, setTotal] = useState(() => {
    try { return Number(localStorage.getItem(TOTAL_KEY) || "0"); } catch { return 0; }
  });

  useEffect(() => {
    const onStorage = () => {
      try { setTotal(Number(localStorage.getItem(TOTAL_KEY) || "0")); } catch {}
    };
    // track typing time via custom event from TypingArea
    const onTick = (e: Event) => {
      const detail = (e as CustomEvent).detail as { seconds: number };
      if (!detail?.seconds) return;
      setTotal((prev) => {
        const next = prev + detail.seconds;
        try { localStorage.setItem(TOTAL_KEY, String(next)); } catch {}
        return next;
      });
    };
    window.addEventListener("typecraft-tick" as never, onTick as never);
    window.addEventListener("storage", onStorage as never);
    // check every minute
    const iv = setInterval(() => {
      const lastBreak = Number(localStorage.getItem(POMO_KEY) || "0");
      const now = Date.now();
      if (!lastBreak) { localStorage.setItem(POMO_KEY, String(now)); return; }
      const mins = (now - lastBreak) / 60000;
      if (mins >= 15) setShow(true);
    }, 60000);
    return () => {
      window.removeEventListener("typecraft-tick" as never, onTick as never);
      window.removeEventListener("storage", onStorage as never);
      clearInterval(iv);
    };
  }, []);

  const dismiss = (snooze: boolean) => {
    localStorage.setItem(POMO_KEY, String(Date.now()));
    if (snooze) setTimeout(() => setShow(false), 300);
    else setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-[360px] rounded-xl border shadow-lg overflow-hidden animate-[fadeIn_0.3s_ease]" style={{ background: "var(--bg-surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}>
      <div className="px-4 py-3">
        <div className="text-[12px] font-semibold flex items-center gap-2" style={{ color: "var(--text-strong)" }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--success)" }} /> Health nudge
        </div>
        <div className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--text-dim)" }}>
          You’ve typed for <span style={{ color: "var(--text-strong)", fontWeight: 600 }}>{Math.round(total / 60)} min</span> total. Take 20s to look away (20-20-20) and stretch wrists. Pomodoro 25/5 keeps you fresh.
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => dismiss(false)} className="flex-1 h-7 rounded-md text-[11px] font-medium" style={{ background: "var(--primary)", color: "white" }}>Stretch now (20s)</button>
          <button onClick={() => dismiss(true)} className="h-7 px-3 rounded-md text-[11px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Snooze 15m</button>
        </div>
      </div>
      <div className="px-3 py-2 text-[11px] text-center border-t" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-faint)" }}>Local only • No tracking • Dismiss anytime</div>
    </div>
  );
}

// Helper to emit tick from TypingArea
export function emitTypingTick(seconds: number) {
  try { window.dispatchEvent(new CustomEvent("typecraft-tick", { detail: { seconds } })); } catch {}
}
