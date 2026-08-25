import { useEffect, useRef, useState } from "react";
import { useSettingsStore } from "../store/useSettingsStore";
import { useHistoryStore } from "../store/useHistoryStore";
import { useBadgeStore, BADGE_DEFS } from "../store/useBadgeStore";
import { playMechanical, playCorrectWord } from "../lib/sound";
import { Tooltip } from "./Tooltip";

const THEMES = [
  { id: "graphite", label: "Graphite", bg: "#19191B", border: "#2E2E32", dot: "#5E6AD2" },
  { id: "dark", label: "Ink", bg: "#0B0B0D", border: "#1E1E22", dot: "#5E6AD2" },
  { id: "light", label: "Paper", bg: "#FAFAFA", border: "#E4E4E7", dot: "#5E6AD2" },
  { id: "midnight", label: "Midnight", bg: "#050A14", border: "#162040", dot: "#3B82F6" },
  { id: "forest", label: "Forest", bg: "#050A07", border: "#1A2E1E", dot: "#10B981" },
  { id: "rose", label: "Rose", bg: "#0A0508", border: "#2E1A28", dot: "#E11D48" },
] as const;

export function Header({ onLogoClick, activeView, onViewChange, onTour }: { onLogoClick: () => void; activeView?: string; onViewChange?: (v: string) => void; onTour?: () => void }) {
  const { theme, setTheme, soundOnClick, soundKeys, soundWords, toggle } = useSettingsStore();
  const best = useHistoryStore((s) => s.bestWpm());
  const badgeLatest = useBadgeStore((s) => s.latest);
  const badgeUnlocked = useBadgeStore((s) => s.unlocked);
  const [themeOpen, setThemeOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [stars, setStars] = useState<number | null>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const soundRef = useRef<HTMLDivElement>(null);
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? "⌘" : "Ctrl";

  useEffect(() => {
    fetch("https://api.github.com/repos/SarthakKrishak/Typecraft")
      .then((r) => r.json())
      .then((d) => { if (d.stargazers_count !== undefined) setStars(d.stargazers_count); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false);
      if (soundRef.current && !soundRef.current.contains(e.target as Node)) setSoundOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setThemeOpen(false); setSoundOpen(false); setHelpOpen(false); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); const i = THEMES.findIndex((t) => t.id === theme); setTheme(THEMES[(i + 1) % THEMES.length].id as never); }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") { e.preventDefault(); setHelpOpen((v) => !v); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); toggle("soundOnClick"); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") { e.preventDefault(); onViewChange?.("race"); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") { e.preventDefault(); onViewChange?.("analytics"); }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); onLogoClick(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [theme, setTheme, onLogoClick, onViewChange]);

  return (
    <header data-tour="header" className="sticky top-0 z-40 w-full" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
      <div className="max-w-[1200px] mx-auto px-4 h-[44px] flex items-center justify-between gap-3">
        {/* Left — logo + nav + best WPM */}
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={onLogoClick} className="flex items-center gap-2 shrink-0">
            <div className="w-[20px] h-[20px] rounded-[4px] flex items-center justify-center" style={{ background: "var(--text-strong)" }}>
              <span className="font-mono text-[10px] font-bold" style={{ color: "var(--bg)" }}>›_</span>
            </div>
            <span className="text-[13px] font-semibold tracking-tight hidden sm:inline" style={{ color: "var(--text-strong)" }}>typecheck</span>
          </button>

          <nav className="hidden md:flex items-center gap-0.5">
            {[{ id: "test", label: "Test" }, { id: "race", label: "Race" }, { id: "analytics", label: "Analytics" }, { id: "badges", label: "Badges" }].map((item) => {
              const active = activeView === item.id || (item.id === "test" && !activeView);
              return (
                <button key={item.id} onClick={() => onViewChange?.(item.id)} className="px-2 py-1 text-[12.5px] font-[450] tracking-tight rounded-[4px]" style={{ color: active ? "var(--text-strong)" : "var(--text-dim)", background: active ? "var(--bg-muted)" : "transparent" }}>{item.label}</button>
              );
            })}
          </nav>

          {/* Best WPM badge */}
          {best > 0 && (
            <Tooltip content="Your personal best words-per-minute across all completed tests">
              <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold cursor-default" style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-border)", color: "var(--accent-light)" }}>
                {best} <span className="text-[9px] font-sans font-medium" style={{ color: "var(--text-dim)" }}>best</span>
              </span>
            </Tooltip>
          )}

          {/* Latest 3 badges */}
          {badgeLatest.length > 0 && (
            <div className="hidden xl:flex items-center gap-1">
              {badgeLatest.map((id) => {
                const def = BADGE_DEFS.find((b) => b.id === id);
                if (!def) return null;
                const ts = def.tier === "diamond" ? "#64b5f6" : def.tier === "gold" ? "#d4af37" : def.tier === "silver" ? "#a0a0b0" : "#c4884a";
                return (
                  <Tooltip key={id} content={`${def.name} — ${def.desc}`}>
                    <span className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[9px] font-mono font-bold border cursor-default" style={{ background: `${ts}18`, borderColor: `${ts}40`, color: ts }}>
                      {def.icon}
                    </span>
                  </Tooltip>
                );
              })}
              <span className="text-[9px] font-mono" style={{ color: "var(--text-faint)" }}>
                {Object.keys(badgeUnlocked).length}/{BADGE_DEFS.length}
              </span>
            </div>
          )}
        </div>

        {/* Right — labeled controls + GitHub star */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sound — icon + label */}
          <div ref={soundRef} data-tour="sound" className="relative">
            <button
              onClick={() => setSoundOpen((v) => !v)}
              className="h-6 px-1.5 rounded-[4px] flex items-center gap-1 border text-[11px]"
              style={{ background: soundOnClick ? "var(--primary-soft)" : "transparent", borderColor: soundOnClick ? "var(--primary-border)" : "var(--border)", color: soundOnClick ? "var(--primary)" : "var(--text-dim)" }}
            >
              <span>{soundOnClick ? "◉" : "○"}</span>
              <span className="hidden lg:inline">Sound</span>
            </button>
            {soundOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-[260px] rounded-md border overflow-hidden animate-[fadeIn_0.1s_ease] z-50" style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", boxShadow: "var(--shadow-lg)" }}>
                <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text-strong)" }}>Sound</span>
                  <input type="checkbox" checked={soundOnClick} onChange={() => toggle("soundOnClick")} className="accent-[var(--primary)] w-3 h-3" />
                </div>
                <div className="px-1.5 py-1.5 space-y-0.5">
                  {[
                    { label: "Mechanical keys", sub: "Thock per key", checked: soundKeys, toggleKey: "soundKeys" as const, preview: () => playMechanical(true) },
                    { label: "Word chime", sub: "Pop on perfect words", checked: soundWords, toggleKey: "soundWords" as const, preview: () => playCorrectWord() },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between px-2 py-1.5 rounded-[4px] hover:bg-[var(--bg-hover)]" style={{ opacity: soundOnClick ? 1 : 0.4 }}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={s.checked} onChange={() => toggle(s.toggleKey)} disabled={!soundOnClick} className="accent-[var(--primary)] w-3 h-3" />
                        <span><span className="text-[11px] font-medium block leading-tight" style={{ color: "var(--text-strong)" }}>{s.label}</span><span className="text-[10px]" style={{ color: "var(--text-faint)" }}>{s.sub}</span></span>
                      </label>
                      <button onClick={() => { if (!soundOnClick) toggle("soundOnClick"); s.preview(); }} className="text-[10px] font-medium px-1.5 py-0.5 rounded border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Test</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Theme — swatch + label */}
          <div ref={themeRef} data-tour="theme" className="relative">
            <button onClick={() => setThemeOpen((v) => !v)} className="h-6 px-1.5 rounded-[4px] flex items-center gap-1.5 border" style={{ background: "transparent", borderColor: "var(--border)" }}>
              <span className="w-3 h-3 rounded-full border shrink-0" style={{ background: current.bg, borderColor: current.border }}>
                <span className="block w-1 h-1 rounded-full mx-auto mt-[2px]" style={{ background: current.dot }} />
              </span>
              <span className="hidden lg:inline text-[11px]" style={{ color: "var(--text-dim)" }}>{current.label}</span>
            </button>
            {themeOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-[220px] rounded-md border overflow-hidden animate-[fadeIn_0.1s_ease] z-50" style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", boxShadow: "var(--shadow-lg)" }}>
                <div className="px-2 py-1.5 space-y-0.5">
                  {THEMES.map((t) => {
                    const active = theme === t.id;
                    return (
                      <button key={t.id} onClick={() => { setTheme(t.id as never); setThemeOpen(false); }} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[4px] text-left" style={{ background: active ? "var(--bg-muted)" : "transparent" }}>
                        <span className="w-4 h-4 rounded-full border shrink-0" style={{ background: t.bg, borderColor: t.border }}>
                          <span className="block w-1.5 h-1.5 rounded-full mx-auto mt-[3px]" style={{ background: t.dot }} />
                        </span>
                        <span className="flex-1 text-[12px] font-medium" style={{ color: "var(--text-strong)" }}>{t.label}</span>
                        {active && <span className="text-[10px]" style={{ color: "var(--primary)" }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tour */}
          {onTour && (
            <button onClick={onTour} className="hidden md:inline-flex h-6 px-2 rounded-[4px] text-[11px] font-medium items-center border" style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text-dim)" }}>
              Tour
            </button>
          )}

          {/* Help */}
          <Tooltip content="Keyboard shortcuts">
            <button onClick={() => setHelpOpen((v) => !v)} className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[10px] font-mono border" style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text-dim)" }}>?</button>
          </Tooltip>

          {/* GitHub Star */}
          <a
            href="https://github.com/SarthakKrishak/Typecraft"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex h-6 px-2.5 rounded-[4px] items-center gap-1.5 text-[11px] font-medium border ml-1"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)", color: "var(--text-strong)" }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
            Star
            {stars !== null && (
              <span className="text-[10px] font-mono px-1 py-px rounded-[3px]" style={{ background: "var(--bg-muted)", color: "var(--text-dim)" }}>{stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}</span>
            )}
          </a>
        </div>

        {/* Help modal */}
        {helpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setHelpOpen(false)}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
            <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[440px] rounded-lg border overflow-hidden" style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", boxShadow: "var(--shadow-lg)" }}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                <span className="text-[12px] font-semibold" style={{ color: "var(--text-strong)" }}>Keyboard Shortcuts</span>
                <button onClick={() => setHelpOpen(false)} className="text-[14px]" style={{ color: "var(--text-dim)" }}>×</button>
              </div>
              <div className="p-3 grid grid-cols-2 gap-x-4 text-[11px]">
                {[
                  ["Restart test", `${mod} ↵`], ["Cycle theme", `${mod} J`],
                  ["Toggle sound", `${mod} S`], ["Go to Race", `${mod} R`],
                  ["Go to Analytics", `${mod} E`], ["Delete word", `${mod} ⌫`],
                  ["This panel", `${mod} /`], ["Close", `Esc`],
                ].map(([l, k]) => (
                  <div key={l} className="flex items-center justify-between py-1 border-b" style={{ borderColor: "var(--border)" }}>
                    <span style={{ color: "var(--text-dim)" }}>{l}</span>
                    <span className="kbd">{k}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
