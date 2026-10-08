import { useEffect, useState, useLayoutEffect, useRef, useCallback } from "react";
import { useModalBehavior } from "../lib/modal";

type Step = {
  id: string;
  kicker: string;
  title: string;
  desc: string;
  hint?: string;
  target?: string;
  placement?: "bottom" | "top" | "center";
};

const STEPS: Step[] = [
  { id: "welcome", kicker: "Welcome", title: "Welcome to typecheck", desc: "Minimal, private, fast — no login, everything stays in your browser. This 9-step tour takes ~40 seconds. Replay it anytime from the Tour button in the header.", placement: "center" },
  { id: "header", kicker: "Navigate", title: "Test · Race · Analytics · Badges", desc: "Switch views here. Sound, theme and your profile live on the right. Press ? anytime for keyboard shortcuts.", hint: "? — shortcuts", target: "[data-tour='header']" },
  { id: "test-config", kicker: "Configure", title: "Test controls", desc: "Pick a mode — Time, Words, Quote, Zen, or Custom — set the length, and toggle punctuation, numbers, or code for extra challenge.", target: "[data-tour='test-config']" },
  { id: "typing-area", kicker: "Type", title: "Typing canvas", desc: "Just start typing — the clock starts on your first key. Correct letters go green, errors red. Enter restarts, Ctrl+Backspace clears a word.", hint: "Enter — restart", target: "[data-tour='typing-area']" },
  { id: "sound", kicker: "Feel", title: "Mechanical sound", desc: "Off by default. Enable it for thocky key sounds plus a chime on perfect words — each toggleable separately.", target: "[data-tour='sound']" },
  { id: "theme", kicker: "Style", title: "Themes", desc: "Six themes with live previews — cycle them instantly. Caret style, font size and accessibility options live in Preferences below.", hint: "⌘/Ctrl J — cycle theme", target: "[data-tour='theme']" },
  { id: "race", kicker: "Compete", title: "Real-time races", desc: "Host an open or private room, share the link, and race friends live across devices with a synced countdown and podium finish.", target: "[data-tour='race']" },
  { id: "analytics", kicker: "Improve", title: "Analytics", desc: "WPM trend, per-second speed, keyboard error heatmap, finger-level breakdown, your Wrapped card and replay theater. Export everything as CSV.", target: "[data-tour='analytics']" },
  { id: "prefs", kicker: "Tune", title: "Preferences", desc: "Blind mode, strict word mode, adaptive difficulty, focus mode, dyslexia font, ghost pacer — all saved locally, no account needed. You're all set!", target: "[data-tour='prefs']" },
];

export function Tour({ open, onClose, onNavigate, onFinish }: {
  open: boolean;
  onClose: () => void;
  onNavigate?: (v: string) => void;
  onFinish?: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = STEPS[idx];
  const total = STEPS.length;
  const last = idx === total - 1;

  const finish = useCallback(() => { onFinish?.(); onClose(); }, [onFinish, onClose]);
  const next = useCallback(() => {
    if (idx < total - 1) setIdx((i) => i + 1);
    else finish();
  }, [idx, total, finish]);
  const back = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  useModalBehavior(open, closeModal, cardRef);
  function closeModal() { onClose(); }

  // keyboard: arrows navigate, Enter advances, Esc closes (via modal hook)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, back]);

  const updateRect = () => {
    if (!step.target || step.placement === "center") { setRect(null); return; }
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect(r);
    el.style.transition = "transform 280ms cubic-bezier(0.2,0,0,1), box-shadow 280ms ease";
    el.style.transform = "scale(1.015)";
    el.style.boxShadow = "0 0 0 2px var(--primary), var(--shadow-lg)";
    el.style.zIndex = "30";
    el.style.position = "relative";
  };

  useEffect(() => {
    if (!open) return;
    if (step.id === "race") onNavigate?.("race");
    else if (step.id === "analytics") onNavigate?.("analytics");
    else if (["header", "test-config", "typing-area", "sound", "theme"].includes(step.id)) onNavigate?.("test");
    if (step.id === "prefs") setTimeout(() => document.getElementById("footer-settings")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }, [idx, open, step.id, onNavigate]);

  useLayoutEffect(() => {
    document.querySelectorAll("[data-tour]").forEach((el) => {
      (el as HTMLElement).style.transform = "";
      (el as HTMLElement).style.boxShadow = "";
      (el as HTMLElement).style.zIndex = "";
    });
    if (!open) return;
    // Retry — the target view may still be mounting after onNavigate.
    const t = setTimeout(() => updateRect(), 80);
    const t2 = setTimeout(() => updateRect(), 350);
    const onResize = () => updateRect();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      document.querySelectorAll("[data-tour]").forEach((el) => {
        (el as HTMLElement).style.transform = "";
        (el as HTMLElement).style.boxShadow = "";
        (el as HTMLElement).style.zIndex = "";
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, open, step.target]);

  useEffect(() => {
    if (!open) setIdx(0);
  }, [open]);

  if (!open) return null;

  const isCenter = !step.target || step.placement === "center";
  // If the target isn't mounted yet, fall back to a centered card.
  const targetMissing = !isCenter && !rect;

  // Anchored popover position: below the spotlight when it fits, else above.
  // Horizontally clamped to the viewport.
  let cardStyle: React.CSSProperties = {};
  let anchored = false;
  if (rect && !isCenter) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const CARD_W = Math.min(400, vw - 32);
    const EST_H = 250;
    const left = Math.max(16, Math.min(rect.left, vw - CARD_W - 16));
    const belowFits = rect.bottom + 12 + EST_H <= vh;
    const placeBelow = step.placement !== "top" && (belowFits || step.placement === "bottom" || rect.top < EST_H + 60);
    anchored = true;
    cardStyle = placeBelow
      ? { position: "fixed", left, top: rect.bottom + 12, width: CARD_W }
      : { position: "fixed", left, top: Math.max(12, rect.top - 12), width: CARD_W, transform: "translateY(-100%)" };
  }

  return (
    <div className={`fixed inset-0 z-[60] ${(anchored || isCenter || targetMissing) ? "" : "flex items-center justify-center"}`}>
      {/* dim backdrop */}
      {isCenter || targetMissing ? (
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.42)" }} onClick={onClose} />
      ) : (
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.08)" }} onClick={onClose} />
      )}

      {/* spotlight hole */}
      {rect && !isCenter && (
        <div
          className="fixed pointer-events-none transition-all duration-300"
          style={{
            left: rect.left - 8,
            top: rect.top - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            borderRadius: 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 2px var(--primary)",
            border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        />
      )}

      {/* card — anchored popover, or centered */}
      <div
        ref={cardRef}
        role="dialog" aria-modal="true" aria-label={step.title}
        className={anchored ? "rounded-lg border overflow-hidden transition-all duration-300" : "relative w-full max-w-[400px] mx-4 my-auto rounded-lg border overflow-hidden animate-[fadeIn_0.15s_ease]"}
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", boxShadow: "var(--shadow-lg)", zIndex: 1, ...cardStyle }}
      >
        <div className="px-4 pt-3" aria-live="polite">
          {/* progress — clickable dots */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIdx(i)}
                title={`${i + 1}. ${s.title}`}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                className="h-[14px] flex items-center rounded-full"
                style={{ width: i === idx ? 22 : 14 }}
              >
                <span className="h-[3px] rounded-full transition-all duration-200 w-full" style={{ background: i < idx ? "var(--primary)" : i === idx ? "var(--primary)" : "var(--border-strong)", opacity: i < idx ? 0.55 : 1 }} />
              </button>
            ))}
            <span className="ml-auto text-[10px] font-mono shrink-0" style={{ color: "var(--text-faint)" }}>{idx + 1}/{total}</span>
          </div>
          <div className="text-[10px] font-semibold tracking-widest uppercase mt-2.5" style={{ color: "var(--primary)" }}>{step.kicker}</div>
          <h3 className="text-[14px] font-semibold tracking-tight mt-0.5" style={{ color: "var(--text-strong)" }}>{step.title}</h3>
          <p className="text-[12.5px] leading-relaxed mt-1" style={{ color: "var(--text-dim)" }}>{step.desc}</p>
          {step.hint && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-faint)" }}>
              <span className="kbd">{step.hint.split(" — ")[0]}</span>
              <span>{step.hint.split(" — ")[1] ?? ""}</span>
            </div>
          )}
        </div>

        <div className="px-3 py-2.5 mt-3 flex items-center justify-between border-t" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-1">
            <button onClick={onClose} className="text-[11px] font-medium px-2 py-1 rounded-[4px] hover:underline" style={{ color: "var(--text-faint)" }}>Skip tour</button>
            {idx > 0 && (
              <button onClick={back} className="h-7 px-3 rounded-[5px] text-[11px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>← Back</button>
            )}
          </div>
          <span className="text-[10px] hidden sm:inline" style={{ color: "var(--text-faint)" }}>← → to move</span>
          <button
            onClick={next}
            autoFocus
            className="h-7 px-3.5 rounded-[5px] text-[11px] font-semibold"
            style={{ background: "var(--text-strong)", color: "var(--bg)" }}
          >
            {last ? "Get started →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line react(only-export-components)
export function useTour() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const seen = localStorage.getItem("typecraft_has_seen_tour_v1");
    if (!seen) setTimeout(() => setOpen(true), 600);
  }, []);
  const close = () => {
    localStorage.setItem("typecraft_has_seen_tour_v1", "1");
    setOpen(false);
  };
  const replay = () => setOpen(true);
  return { open, close, replay, setOpen };
}
