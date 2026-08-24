import { useSettingsStore } from "../store/useSettingsStore";
import { useHistoryStore } from "../store/useHistoryStore";
import { useDeckStore } from "../store/useDeckStore";
import { playMechanical, playCorrectWord } from "../lib/sound";

const THEMES = [
  { id: "dark", label: "Ink", desc: "Neutral", bg: "#0A0A0B", surface: "#17171A", border: "#1E1E22", dot: "#5E6AD2" },
  { id: "light", label: "Paper", desc: "Clean", bg: "#FCFCFC", surface: "#FFFFFF", border: "#E6E6E8", dot: "#5E6AD2" },
  { id: "midnight", label: "Midnight", desc: "Deep blue", bg: "#050A14", surface: "#0F1A2E", border: "#162040", dot: "#3B82F6" },
  { id: "forest", label: "Forest", desc: "Muted green", bg: "#050A07", surface: "#0F1E14", border: "#1A2E1E", dot: "#10B981" },
  { id: "rose", label: "Rose", desc: "Soft plum", bg: "#0A0508", surface: "#1E0F1A", border: "#2E1A28", dot: "#E11D48" },
] as const;

export function FooterSettings() {
  const s = useSettingsStore();
  const history = useHistoryStore((x) => x.results);
  const clear = useHistoryStore((x) => x.clear);
  const avg = useHistoryStore((x) => x.avgWpm());
  const best = useHistoryStore((x) => x.bestWpm());
  const deck = useDeckStore();

  return (
    <div id="footer-settings" className="w-full max-w-[740px] mx-auto px-4 py-10">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Preferences — restrained */}
        <div data-tour="prefs" className="panel p-5">
          <div className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--text-dim)" }}>Preferences</div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium" style={{ color: "var(--text-strong)" }}>Theme</span>
                <span className="text-[11px] font-mono" style={{ color: "var(--text-faint)" }}>{THEMES.find((t) => t.id === s.theme)?.label} • {THEMES.length} options</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => {
                  const active = s.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => s.setTheme(t.id as never)}
                      className="rounded-md border p-2 text-left transition-all"
                      style={{ background: active ? "var(--bg-muted)" : "var(--bg-card)", borderColor: active ? "var(--text-strong)" : "var(--border)", boxShadow: active ? "var(--shadow-sm)" : "none" }}
                    >
                      <span className="block w-full h-[36px] rounded-[6px] border overflow-hidden flex flex-col" style={{ background: t.bg, borderColor: t.border }}>
                        <span className="h-[10px] flex items-center gap-1 px-1.5" style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: t.dot }} />
                          <span className="flex-1 h-1 rounded-full" style={{ background: t.border }} />
                        </span>
                        <span className="flex-1 flex gap-1 p-1">
                          <span className="flex-1 rounded-[3px]" style={{ background: t.surface, border: `1px solid ${t.border}` }} />
                          <span className="flex-1 rounded-[3px] border border-dashed" style={{ borderColor: t.border }} />
                        </span>
                      </span>
                      <span className="block text-[11px] font-medium mt-1.5 leading-none" style={{ color: active ? "var(--text-strong)" : "var(--text-strong)" }}>{t.label}</span>
                      <span className="block text-[10px] mt-0.5" style={{ color: "var(--text-dim)" }}>{t.desc}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: "var(--text-dim)" }}>
                <span className="kbd">⌘</span> + <span className="kbd">J</span> to cycle — <span style={{ color: "var(--text-faint)" }}>also in header</span>
              </div>
            </div>

            <div className="h-px" style={{ background: "var(--border)" }} />

            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] font-medium" style={{ color: "var(--text-strong)" }}>Caret</span>
              <div className="flex p-0.5 rounded-md" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
                {(["line", "block", "underline"] as const).map((c) => (
                  <button key={c} onClick={() => s.setCaret(c)} className="px-2.5 py-1 rounded-[5px] text-[12px] font-medium capitalize" style={{ background: s.caretStyle === c ? "var(--bg-card)" : "transparent", color: s.caretStyle === c ? "var(--text-strong)" : "var(--text-dim)", border: s.caretStyle === c ? "1px solid var(--border-strong)" : "1px solid transparent", boxShadow: s.caretStyle === c ? "var(--shadow-sm)" : "none" }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-[13px] font-medium" style={{ color: "var(--text-strong)" }}>Font size</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => s.setFontSize(Math.max(16, s.fontSize - 2))} className="w-7 h-7 rounded-md flex items-center justify-center border text-[13px]" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>−</button>
                <span className="font-mono text-[12px] font-medium min-w-[44px] text-center" style={{ color: "var(--text-strong)" }}>{s.fontSize}px</span>
                <button onClick={() => s.setFontSize(Math.min(36, s.fontSize + 2))} className="w-7 h-7 rounded-md flex items-center justify-center border text-[13px]" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>+</button>
              </div>
            </div>

            <div className="h-px" style={{ background: "var(--border)" }} />

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[13px]" style={{ color: "var(--text-strong)" }}>Blind mode <span className="font-normal" style={{ color: "var(--text-dim)" }}>— hide errors while typing</span></span>
              <input type="checkbox" checked={s.blindMode} onChange={() => s.toggle("blindMode")} className="accent-[var(--primary)] w-3.5 h-3.5" />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[13px]" style={{ color: "var(--text-strong)" }}>Stop on word</span>
              <input type="checkbox" checked={s.stopOnWord} onChange={() => s.toggle("stopOnWord")} className="accent-[var(--primary)] w-3.5 h-3.5" />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer p-2.5 rounded-md border" style={{ background: s.adaptive ? "var(--primary-soft)" : "var(--bg-muted)", borderColor: s.adaptive ? "var(--primary-border)" : "var(--border)" }}>
              <span className="text-[13px]" style={{ color: "var(--text-strong)" }}>Adaptive Lab <span className="font-normal" style={{ color: "var(--text-dim)" }}>— auto difficulty</span></span>
              <input type="checkbox" checked={s.adaptive} onChange={() => s.toggle("adaptive")} className="accent-[var(--primary)] w-3.5 h-3.5" />
            </label>
            <div className="h-px" style={{ background: "var(--border)" }} />
            <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Focus / Calm / A11y</div>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[13px]" style={{ color: "var(--text-strong)" }}>Focus mode <span className="font-normal" style={{ color: "var(--text-dim)" }}>— hide chrome</span></span>
              <input type="checkbox" checked={s.focusMode} onChange={() => s.toggle("focusMode")} className="accent-[var(--primary)] w-3.5 h-3.5" />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[13px]" style={{ color: "var(--text-strong)" }}>Dyslexia font</span>
              <input type="checkbox" checked={s.dyslexia} onChange={() => s.toggle("dyslexia")} className="accent-[var(--primary)] w-3.5 h-3.5" />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[13px]" style={{ color: "var(--text-strong)" }}>High contrast</span>
              <input type="checkbox" checked={s.highContrast} onChange={() => s.toggle("highContrast")} className="accent-[var(--primary)] w-3.5 h-3.5" />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[13px]" style={{ color: "var(--text-strong)" }}>Breathing bar <span className="font-normal" style={{ color: "var(--text-dim)" }}>— calm</span></span>
              <input type="checkbox" checked={s.breathing} onChange={() => s.toggle("breathing")} className="accent-[var(--primary)] w-3.5 h-3.5" />
            </label>
            <div className="h-px" style={{ background: "var(--border)" }} />
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[13px]" style={{ color: "var(--text-strong)" }}>Ghost pace</span>
                <input type="checkbox" checked={s.ghost} onChange={() => s.toggle("ghost")} className="accent-[var(--primary)] w-3.5 h-3.5" />
              </label>
              <div className="flex items-center gap-1.5">
                <input type="number" min={0} max={200} value={s.ghostWpm || ""} onChange={(e) => s.setGhostWpm(Number(e.target.value) || 0)} placeholder="best" className="w-14 h-7 rounded-md border px-2 text-[12px] font-mono text-center" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }} />
                <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>WPM</span>
              </div>
            </div>
            <div className="text-[11px] pl-1" style={{ color: "var(--text-dim)" }}>Ghost vs {s.ghostWpm ? `${s.ghostWpm} WPM` : "best"} — replays keystroke-for-keystroke when available.</div>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[13px]" style={{ color: "var(--text-strong)" }}>Hand guide <span className="font-normal" style={{ color: "var(--text-dim)" }}>— finger hint SVG</span></span>
              <input type="checkbox" checked={s.handGuide} onChange={() => s.toggle("handGuide")} className="accent-[var(--primary)] w-3.5 h-3.5" />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-[13px]" style={{ color: "var(--text-strong)" }}>Rhythm metronome <span className="font-normal" style={{ color: "var(--text-dim)" }}>— 90 BPM ticks</span></span>
              <input type="checkbox" checked={s.rhythm} onChange={() => s.toggle("rhythm")} className="accent-[var(--primary)] w-3.5 h-3.5" />
            </label>
            <div className="rounded-md border p-3 space-y-2" style={{ background: s.soundOnClick ? "var(--bg-muted)" : "var(--bg-muted)", borderColor: "var(--border)" }}>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-[13px] font-medium" style={{ color: "var(--text-strong)" }}>Sound <span className="font-normal" style={{ color: "var(--text-dim)" }}>— master</span></span>
                <input type="checkbox" checked={s.soundOnClick} onChange={() => s.toggle("soundOnClick")} className="accent-[var(--primary)] w-3.5 h-3.5" />
              </label>
              <div className="flex items-center justify-between gap-3 pl-1">
                <label className="flex items-center gap-2 cursor-pointer text-[12px]" style={{ color: s.soundOnClick ? "var(--text-strong)" : "var(--text-dim)", opacity: s.soundOnClick ? 1 : 0.5 }}>
                  <input type="checkbox" checked={s.soundKeys} onChange={() => s.toggle("soundKeys")} disabled={!s.soundOnClick} className="accent-[var(--primary)] w-3 h-3" />
                  Mechanical keys
                </label>
                <button
                  onClick={() => {
                    if (!s.soundOnClick) s.toggle("soundOnClick");
                    if (!s.soundKeys && s.soundOnClick) s.toggle("soundKeys");
                    playMechanical(true);
                  }}
                  className="h-6 px-2.5 rounded-md text-[11px] font-medium border"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}
                >
                  Preview
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 pl-1">
                <label className="flex items-center gap-2 cursor-pointer text-[12px]" style={{ color: s.soundOnClick ? "var(--text-strong)" : "var(--text-dim)", opacity: s.soundOnClick ? 1 : 0.5 }}>
                  <input type="checkbox" checked={s.soundWords} onChange={() => s.toggle("soundWords")} disabled={!s.soundOnClick} className="accent-[var(--primary)] w-3 h-3" />
                  Correct word chime
                </label>
                <button
                  onClick={() => {
                    if (!s.soundOnClick) s.toggle("soundOnClick");
                    if (!s.soundWords && s.soundOnClick) s.toggle("soundWords");
                    playCorrectWord();
                  }}
                  className="h-6 px-2.5 rounded-md text-[11px] font-medium border"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}
                >
                  Preview
                </button>
              </div>
            </div>
            <div className="text-[11px] pl-1 leading-relaxed" style={{ color: "var(--text-dim)" }}>
              <span style={{ color: "var(--text-strong)" }}>Mechanical</span> on every key, <span style={{ color: "var(--text-strong)" }}>chime</span> only on perfect words. Toggle each separately — master with <span className="kbd">⌘</span> + <span className="kbd">S</span> / <span className="kbd">Ctrl</span> + <span className="kbd">S</span>. Zero delay (pre-warmed AudioContext).
            </div>
          </div>
        </div>

        {/* History — table, not cards */}
        <div className="panel p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Recent runs</span>
            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  onClick={() => {
                    const header = "wpm,raw,accuracy,time,mode,language,punctuation,numbers,timestamp\n";
                    const rows = history.map((r) => `${r.wpm},${r.rawWpm},${r.accuracy},${r.time},${r.mode},${r.language},${r.punctuation},${r.numbers},${new Date(r.timestamp).toISOString()}`).join("\n");
                    const blob = new Blob([header + rows], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = "typecraft-history.csv"; a.click(); URL.revokeObjectURL(url);
                  }}
                  className="text-[11px] font-medium px-2 py-1 rounded-md border"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}
                >
                  Export CSV
                </button>
              )}
              <span className="text-[11px] font-mono hidden sm:inline" style={{ color: "var(--text-dim)" }}>{history.length} · avg {avg || "—"} · best {best || "—"}</span>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center rounded-md border border-dashed" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
              <span className="text-[12px] font-medium" style={{ color: "var(--text-dim)" }}>No runs yet</span>
              <span className="text-[11px] mt-1" style={{ color: "var(--text-faint)" }}>Complete a test to see history.</span>
            </div>
          ) : (
            <>
              <div className="space-y-1 max-h-[220px] overflow-auto pr-1">
                <div className="grid grid-cols-[56px_1fr_56px] gap-2 px-2 pb-1 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>
                  <span>WPM</span><span>Meta</span><span className="text-right">Acc</span>
                </div>
                {history.slice(0, 8).map((r) => (
                  <div key={r.id} className="grid grid-cols-[56px_1fr_56px] items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: r.wpm === best ? "var(--primary-soft)" : "transparent", border: r.wpm === best ? "1px solid var(--primary-border)" : "1px solid transparent" }}>
                    <span className="font-mono text-[13px] font-semibold" style={{ color: r.wpm === best ? "var(--primary)" : "var(--text-strong)" }}>{r.wpm}</span>
                    <span className="text-[11px] font-mono truncate" style={{ color: "var(--text-dim)" }}>{r.mode} · {r.time}s · {new Date(r.timestamp).toLocaleDateString()}</span>
                    <span className="font-mono text-[11px] font-medium text-right" style={{ color: "var(--text-strong)" }}>{r.accuracy}%</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button onClick={clear} className="text-[11px] font-medium hover:underline" style={{ color: "var(--text-dim)" }}>Clear</button>
                <span className="text-[11px] font-mono" style={{ color: "var(--text-faint)" }}>{history.length} total</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel p-5 mt-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Vocabulary Deck • {deck.words.length} words</span>
          <label className="flex items-center gap-2 cursor-pointer text-[11px]">
            <input type="checkbox" checked={deck.enabled} onChange={(e) => deck.setEnabled(e.target.checked)} className="accent-[var(--primary)] w-3 h-3" />
            <span style={{ color: "var(--text-strong)" }}>Inject 30%</span>
          </label>
        </div>
        {deck.words.length === 0 ? (
          <div className="text-[11px] mt-3 py-4 text-center rounded-md border border-dashed" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)", color: "var(--text-dim)" }}>Deck empty — save weak words from coach or add manually. Drill injects 30% deck words into next test.</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mt-3 max-h-[80px] overflow-auto">
              {deck.words.slice(0, 40).map((w) => (
                <span key={w} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-mono" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-strong)" }}>
                  {w} <button onClick={() => deck.remove(w)} className="ml-1 text-[10px] leading-none" style={{ color: "var(--text-faint)" }}>×</button>
                </span>
              ))}
              {deck.words.length > 40 && <span className="text-[11px] px-2 py-1" style={{ color: "var(--text-faint)" }}>+{deck.words.length - 40} more</span>}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => deck.clear()} className="h-6 px-2.5 rounded-md text-[11px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Clear deck</button>
              <span className="text-[11px] py-1" style={{ color: "var(--text-dim)" }}>Auto-injects when enabled — 30% of next test uses deck words.</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 text-[11px] leading-relaxed text-center" style={{ color: "var(--text-dim)" }}>
        <span className="font-medium" style={{ color: "var(--text-strong)" }}>typecheck</span> — minimal, private, fast. No ads. Data stays in your browser.
      </div>
    </div>
  );
}
