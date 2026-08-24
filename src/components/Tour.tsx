import { useEffect, useState, useLayoutEffect, useRef } from "react";

type Step = {
  id: string;
  title: string;
  desc: string;
  target?: string;
  placement?: "bottom" | "top" | "center";
};

const STEPS: Step[] = [
  { id: "welcome", title: "Welcome to typecheck", desc: "Minimal, private, fast — no login. Everything stays in your browser. Let's take a quick tour. You can replay anytime from the Tour button.", placement: "center" },
  { id: "header", title: "Navigation", desc: "Switch between Test, Race, and Analytics. Sound and theme controls are on the right. Press ? for keyboard shortcuts.", target: "[data-tour='header']" },
  { id: "test-config", title: "Test controls", desc: "Pick a mode — Time, Words, Quote, Zen, or Custom — and set the length. Toggle punctuation and numbers for extra challenge.", target: "[data-tour='test-config']" },
  { id: "typing-area", title: "Typing canvas", desc: "Start typing to begin. Correct characters light up, errors show in red. Tab+Enter restarts. Ctrl+Backspace clears a word.", target: "[data-tour='typing-area']" },
  { id: "sound", title: "Mechanical sound", desc: "Sound is off by default. Click the speaker to enable mechanical key thocks and a chime for perfect words — each toggleable separately.", target: "[data-tour='sound']" },
  { id: "theme", title: "Themes", desc: "Five themes with live previews. Cycle with the shortcut. Font size, caret style, and accessibility options live in Preferences below.", target: "[data-tour='theme']" },
  { id: "race", title: "Race mode", desc: "Create public or private rooms. Private rooms need a passcode. Share the link — friends open it in another tab and race in real time.", target: "[data-tour='race']" },
  { id: "analytics", title: "Analytics", desc: "WPM trend, per-second speed chart, keyboard error heatmap, and finger-level breakdown. Export everything as CSV.", target: "[data-tour='analytics']" },
  { id: "prefs", title: "Preferences", desc: "Caret style, font size, sound toggles, blind mode, adaptive difficulty — all saved locally. No account needed.", target: "[data-tour='prefs']" },
];

export function Tour({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate?: (v: string) => void }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = STEPS[idx];

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
    return () => {
      el.style.transform = "";
      el.style.boxShadow = "";
      el.style.zIndex = "";
    };
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
    const t = setTimeout(() => updateRect(), 80);
    const onResize = () => updateRect();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      document.querySelectorAll("[data-tour]").forEach((el) => {
        (el as HTMLElement).style.transform = "";
        (el as HTMLElement).style.boxShadow = "";
        (el as HTMLElement).style.zIndex = "";
      });
    };
  }, [idx, open, step.target]);

  useEffect(() => {
    if (!open) setIdx(0);
  }, [open]);

  if (!open) return null;

  const isCenter = !step.target || step.placement === "center";
  const total = STEPS.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* dim backdrop — no blur */}
      {isCenter ? (
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

      {/* card */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[400px] mx-4 rounded-lg border overflow-hidden animate-[fadeIn_0.15s_ease]"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="px-4 pt-3">
          {/* progress */}
          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <span key={i} className="h-[3px] rounded-full transition-all duration-200" style={{ width: i === idx ? 22 : 8, background: i === idx ? "var(--primary)" : "var(--border-strong)" }} />
            ))}
            <span className="ml-auto text-[10px] font-mono" style={{ color: "var(--text-faint)" }}>{idx + 1}/{total}</span>
          </div>
          <h3 className="text-[14px] font-semibold tracking-tight mt-2.5" style={{ color: "var(--text-strong)" }}>{step.title}</h3>
          <p className="text-[12.5px] leading-relaxed mt-1" style={{ color: "var(--text-dim)" }}>{step.desc}</p>
        </div>

        <div className="px-3 py-2.5 mt-3 flex items-center justify-between border-t" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
          <button onClick={onClose} className="text-[11px] font-medium px-2 py-1 rounded-[4px] hover:underline" style={{ color: "var(--text-faint)" }}>Skip</button>
          <button
            onClick={() => { if (idx < total - 1) setIdx((i) => i + 1); else onClose(); }}
            className="h-7 px-3.5 rounded-[5px] text-[11px] font-semibold"
            style={{ background: "var(--text-strong)", color: "var(--bg)" }}
          >
            {idx === total - 1 ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
