import { useEffect, useState, useLayoutEffect, useRef } from "react";

type Step = {
  id: string;
  title: string;
  desc: string;
  target?: string; // selector
  placement?: "bottom" | "top" | "center";
};

const STEPS: Step[] = [
  { id: "welcome", title: "Welcome to typecraft", desc: "Minimal, private, fast — no login. Everything stays in your browser (localStorage). Let’s take a 30s tour. You can replay anytime from Help (?)", placement: "center" },
  { id: "header", title: "Header & Navigation", desc: "Switch Test • Race • Analytics • History. Theme and sound are here. Press ? for shortcuts (works on Win Ctrl and Mac ⌘).", target: "[data-tour='header']" },
  { id: "test-config", title: "Test controls", desc: "Pick mode Time / Words / Quote / Zen / Custom and length. English / Code, Punctuation, Numbers — all instantly local.", target: "[data-tour='test-config']" },
  { id: "typing-area", title: "Typing canvas", desc: "Your words appear here. Correct is bright, incorrect is red. Caps Lock warns live. Tab+Enter restarts. Ctrl+Backspace clears a word.", target: "[data-tour='typing-area']" },
  { id: "sound", title: "Mechanical sound", desc: "By default sound is OFF. Click the speaker in the header for a dropdown — toggle Mechanical keys and Correct-word chime separately. Zero-latency, pre-warmed.", target: "[data-tour='sound']" },
  { id: "theme", title: "Themes", desc: "Ink (default), Paper, Midnight, Forest, Rose — each with a live preview. Cycle with ⌘+J / Ctrl+J. Fonts and caret live in Preferences below.", target: "[data-tour='theme']" },
  { id: "race", title: "Race — Free & Private rooms", desc: "Create a free lobby or a private room (6-char code). Share the link (?race=CODE) — friends opening it in another tab race live via BroadcastChannel. No server.", target: "[data-tour='race']" },
  { id: "analytics", title: "Analytics & History", desc: "WPM trend, last-run sparkline, and a readable table (WPM/Raw/Acc/Time/Mode). Export CSV/JSON, clear, or keep 200 runs locally.", target: "[data-tour='analytics']" },
  { id: "prefs", title: "Preferences — all local", desc: "Caret, font size, blind/strict, sound toggles, custom text — all saved to localStorage (typing-settings-v4). No cookies, no account.", target: "[data-tour='prefs']" },
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
    // zoom effect
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

  // auto-navigate to make target visible for race/analytics/prefs
  useEffect(() => {
    if (!open) return;
    if (step.id === "race") onNavigate?.("race");
    else if (step.id === "analytics") onNavigate?.("analytics");
    else if (["header", "test-config", "typing-area", "sound", "theme"].includes(step.id)) onNavigate?.("test");
    if (step.id === "prefs") setTimeout(() => document.getElementById("footer-settings")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }, [idx, open, step.id, onNavigate]);

  // cleanup previous zoom on step change
  useLayoutEffect(() => {
    // remove zooms from all
    document.querySelectorAll("[data-tour]").forEach((el) => {
      (el as HTMLElement).style.transform = "";
      (el as HTMLElement).style.boxShadow = "";
      (el as HTMLElement).style.zIndex = "";
    });
    if (!open) return;
    // small delay to let view switch render before measuring
    const t = setTimeout(() => updateRect(), 80);
    const onResize = () => updateRect();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      // also ensure cleanup
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
      {/* dim — only backdrop when centered (no target), otherwise spotlight provides dim with a clear hole so site stays sharp */}
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
            borderRadius: 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 2px var(--primary), var(--shadow-lg)",
            border: "1px solid color-mix(in srgb, var(--primary) 40%, transparent)",
          }}
        />
      )}

      {/* card */}
      <div
        ref={cardRef}
        className="relative w-full max-w-[420px] mx-4 rounded-xl border overflow-hidden animate-[fadeIn_0.2s_ease]"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Tour • {idx + 1} / {total}</span>
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <span key={i} className="h-1 rounded-full transition-all" style={{ width: i === idx ? 20 : 8, background: i === idx ? "var(--primary)" : "var(--border-strong)" }} />
              ))}
            </div>
          </div>
          <h3 className="text-[15px] font-semibold tracking-tight mt-2" style={{ color: "var(--text-strong)" }}>{step.title}</h3>
          <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: "var(--text-dim)" }}>{step.desc}</p>
        </div>

        <div className="px-4 py-3 flex items-center justify-between border-t" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
          <button onClick={onClose} className="text-[12px] font-medium px-3 py-1.5 rounded-md" style={{ color: "var(--text-dim)" }}>Skip</button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono hidden sm:inline" style={{ color: "var(--text-faint)" }}>Zoomed • Next highlights</span>
            <button
              onClick={() => {
                if (idx < total - 1) setIdx((i) => i + 1);
                else onClose();
              }}
              className="h-8 px-4 rounded-md text-[12px] font-semibold flex items-center gap-1.5"
              style={{ background: "var(--text-strong)", color: "var(--bg)" }}
            >
              {idx === total - 1 ? "Done ✓" : "Next →"}
            </button>
          </div>
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
