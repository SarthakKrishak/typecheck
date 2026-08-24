import { useState, useEffect } from "react";
import { Header } from "./components/Header";import { TestConfig } from "./components/TestConfig";
import { TypingArea } from "./components/TypingArea";
import { ResultView } from "./components/Result";
import { FooterSettings } from "./components/FooterSettings";
import { RaceSection } from "./components/Race";
import { Tour, useTour } from "./components/Tour";
import { WeakKeyCoach } from "./components/WeakKeyCoach";
import { HealthNudge } from "./components/HealthNudge";
import { KeyboardDiagram } from "./components/KeyboardDiagram";
import { DailyChallenge } from "./components/DailyChallenge";
import { Wrapped } from "./components/Wrapped";
import { CoachInsights } from "./components/CoachInsights";
import { ReplayTheater } from "./components/ReplayTheater";
import { useSettingsStore } from "./store/useSettingsStore";
import { useHistoryStore } from "./store/useHistoryStore";
import type { Result } from "./engine/stats";

export default function App() {
  const theme = useSettingsStore((s) => s.theme);
  const [result, setResult] = useState<Result | null>(null);
  const [testKey, setTestKey] = useState(0);
  const [view, setView] = useState<"test" | "race" | "analytics" | "history">("test");
  const [drillWords, setDrillWords] = useState<string[] | null>(null);
  const [fixedWords, setFixedWords] = useState<string[] | null>(null);
  const [dailyActive, setDailyActive] = useState(false);
  const [dailyDone, setDailyDone] = useState<{ wpm: number; accuracy: number } | null>(null);
  const addResult = useHistoryStore((s) => s.addResult);
  const history = useHistoryStore((s) => s.results);
  const tour = useTour();

  const startDaily = (words: string[]) => {
    setFixedWords(words);
    setDailyActive(true);
    setDailyDone(null);
    setResult(null);
    setView("test");
    setTestKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleDrill = (words: string[]) => {
    setDrillWords(words);
    setFixedWords(null);
    setDailyActive(false);
    setResult(null);
    setView("test");
    setTestKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  const focusMode = useSettingsStore((s) => s.focusMode);
  const dyslexia = useSettingsStore((s) => s.dyslexia);
  const highContrast = useSettingsStore((s) => s.highContrast);
  const breathing = useSettingsStore((s) => s.breathing);
  useEffect(() => { document.documentElement.setAttribute("data-focus", String(focusMode)); }, [focusMode]);
  useEffect(() => { document.documentElement.setAttribute("data-dyslexia", String(dyslexia)); }, [dyslexia]);
  useEffect(() => { document.documentElement.setAttribute("data-high-contrast", String(highContrast)); }, [highContrast]);
  useEffect(() => { document.documentElement.setAttribute("data-breathing", String(breathing)); }, [breathing]);
  // Esc to quit focus mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && useSettingsStore.getState().focusMode) {
        e.preventDefault();
        useSettingsStore.getState().toggle("focusMode");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Global: Enter to restart (result or test), Space to focus/start when idle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingField = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "Enter" && !isTypingField) {
        if (result) {
          e.preventDefault();
          restart();
        } else if (view === "test") {
          // Enter restarts test anytime (user expectation) — no Tab needed
          e.preventDefault();
          restart();
        }
      } else if (e.key === " " && !result && view === "test" && !isTypingField) {
        // Space to focus input when idle (prevent page scroll)
        const input = document.querySelector('input[aria-label="typing input"]') as HTMLInputElement | null;
        if (input && document.activeElement !== input) {
          e.preventDefault();
          input.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, view]);
  const restart = () => { setResult(null); setDailyActive(false); setFixedWords(null); setView("test"); setTestKey((k) => k + 1); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleResult = (r: Result) => {
    setResult(r);
    addResult(r);
    if (dailyActive) { setDailyDone({ wpm: r.wpm, accuracy: r.accuracy }); setDailyActive(false); }
  };

  // Adaptive Lab — auto adjusts next test when enabled
  const adaptive = useSettingsStore((s) => s.adaptive);
  const setWords = useSettingsStore((s) => s.setWords);
  const setTime = useSettingsStore((s) => s.setTime);
  const setPunct = () => { const s = useSettingsStore.getState(); if (s.punctuation) s.toggle("punctuation"); };
  const setPunctOn = () => { const s = useSettingsStore.getState(); if (!s.punctuation) s.toggle("punctuation"); };
  useEffect(() => {
    if (!adaptive || history.length < 2) return;
    const last = history[0];
    const prev = history[1];
    const last3 = history.slice(0, 3);
    const cur = useSettingsStore.getState();
    if (last.accuracy < 92 && prev.accuracy < 92) {
      if (last.mode === "words" && cur.words !== 10) { setWords(10); if (cur.punctuation) setPunct(); }
      else if (last.mode === "time" && cur.time !== 15) { setTime(15); if (cur.punctuation) setPunct(); }
    }
    if (last3.length === 3 && last3.every((r) => r.accuracy > 97 && r.consistency > 96)) {
      if (last.mode === "words" && cur.words === 10) setWords(25);
      else if (last.mode === "words" && cur.words === 25) { setWords(50); setPunctOn(); }
      else if (last.mode === "time" && cur.time === 15) setTime(30);
      else if (last.mode === "time" && cur.time === 30) { setTime(60); setPunctOn(); }
    }
  }, [history, adaptive, setWords, setTime]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <Header onLogoClick={restart} activeView={result ? "test" : view} onViewChange={(v) => { if (result) restart(); setView(v as never); if (v === "history") setTimeout(() => document.getElementById("footer-settings")?.scrollIntoView({ behavior: "smooth" }), 50); }} onTour={tour.replay} />
      {focusMode && (
        <div data-focus-exit className="fixed top-3 right-3 z-40 flex items-center gap-2 animate-[fadeIn_0.2s_ease]">
          <span className="hidden sm:inline text-[11px] font-mono px-2.5 py-1 rounded-full border shadow-sm" style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Focus • Esc to exit</span>
          <button onClick={() => useSettingsStore.getState().toggle("focusMode")} className="h-8 px-4 rounded-full text-[12px] font-semibold shadow-md border" style={{ background: "var(--text-strong)", color: "var(--bg)", borderColor: "var(--text-strong)" }}>Exit Focus</button>
        </div>
      )}
      <Tour open={tour.open} onClose={tour.close} onNavigate={(v) => { if (result) setResult(null); setView(v as never); window.scrollTo({ top: 0, behavior: "smooth" }); }} />

      {!result && view === "test" && (
        <div className="pt-6 pb-2">
          <TestConfig />
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-start py-6">
        {result ? (
          <ResultView result={result} onRestart={restart} onNext={restart} />
        ) : view === "race" ? (
          <RaceSection />
        ) : view === "analytics" ? (
          <AnalyticsView history={history} />
        ) : view === "history" ? (
          <div className="w-full max-w-[740px] mx-auto px-4 py-6">
            <div className="panel p-5">
              <div className="text-[13px] font-semibold" style={{ color: "var(--text-strong)" }}>History is below</div>
              <div className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>Scroll to Recent runs or start a new test.</div>
              <button onClick={() => setView("test")} className="mt-3 h-7 px-3 rounded-md text-[12px] font-medium" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>Back to test</button>
            </div>
          </div>
        ) : (
          <>
            {!dailyActive && !fixedWords && (
              <div className="w-full max-w-[740px] mx-auto px-4">
                <DailyChallenge onStart={startDaily} active={dailyActive} doneResult={dailyDone} />
              </div>
            )}
            <TypingArea onResult={handleResult} keyTrigger={testKey} drillWords={drillWords} onDrillDone={() => setDrillWords(null)} fixedWords={fixedWords} />
            <div className="w-full max-w-[740px] mx-auto px-4 mt-6 space-y-4">
              <CoachInsights />
              <WeakKeyCoach onDrill={handleDrill} />
            </div>
          </>
        )}
      </main>

      <FooterSettings />
      <HealthNudge />

      {/* ── Footer — multi-column SaaS + built-by strip ── */}
      <footer className="border-t mt-8" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
        <div className="max-w-[1220px] mx-auto px-5 md:px-6">
          {/* Top: brand + link columns */}
          <div className="py-10 flex flex-col md:flex-row items-start justify-between gap-10">
            {/* Brand */}
            <div className="max-w-[280px]">
              <div className="flex items-center gap-2.5">
                <div className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center" style={{ background: "var(--text-strong)" }}>
                  <span className="font-mono text-[11px] font-bold tracking-tighter" style={{ color: "var(--bg)" }}>›_</span>
                </div>
                <span className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--text-strong)" }}>typecheck</span>
              </div>
              <p className="text-[12px] mt-3 leading-relaxed" style={{ color: "var(--text-dim)" }}>
                Type faster. Race anyone. Own your numbers.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>MIT</span>
                <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>OPEN SOURCE</span>
                <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>v1.0.0</span>
              </div>
            </div>

            {/* Link columns */}
            <div className="flex flex-wrap gap-12 md:gap-16">
              <div>
                <div className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-faint)" }}>Product</div>
                <div className="space-y-2">
                  {[
                    ["Test", () => { restart(); }],
                    ["Race", () => { restart(); setView("race"); }],
                    ["Analytics", () => { restart(); setView("analytics"); }],
                    ["Preferences", () => document.getElementById("footer-settings")?.scrollIntoView({ behavior: "smooth" })],
                  ].map(([label, fn]) => (
                    <button key={label as string} onClick={fn as () => void} className="block text-[12px] hover:underline text-left" style={{ color: "var(--text-dim)" }}>{label as string}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-faint)" }}>Resources</div>
                <div className="space-y-2">
                  <button onClick={() => tour.replay()} className="block text-[12px] hover:underline" style={{ color: "var(--text-dim)" }}>Tour</button>
                  <button onClick={() => { restart(); setView("analytics"); }} className="block text-[12px] hover:underline" style={{ color: "var(--text-dim)" }}>Wrapped card</button>
                  <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>Shortcuts: <span className="kbd">?</span></span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-faint)" }}>Why typecheck</div>
                <div className="space-y-2">
                  <span className="block text-[12px]" style={{ color: "var(--text-dim)" }}>Free forever</span>
                  <span className="block text-[12px]" style={{ color: "var(--text-dim)" }}>Open source</span>
                  <span className="block text-[12px]" style={{ color: "var(--text-dim)" }}>Works offline</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-faint)" }}>Connect</div>
                <div className="space-y-2">
                  <a href="https://github.com/SarthakKrishak/Typecraft" target="_blank" rel="noreferrer" className="block text-[12px] hover:underline" style={{ color: "var(--text-dim)" }}>GitHub ↗</a>
                  <a href="https://x.com/SarthakKrishak" target="_blank" rel="noreferrer" className="block text-[12px] hover:underline" style={{ color: "var(--text-dim)" }}>X / Twitter ↗</a>
                  <a href="https://linkedin.com/in/sarthakkrishak" target="_blank" rel="noreferrer" className="block text-[12px] hover:underline" style={{ color: "var(--text-dim)" }}>LinkedIn ↗</a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: built-by strip */}
          <div className="py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-dim)" }}>
              <span className="font-mono" style={{ color: "var(--text-faint)" }}>© 2026</span>
              <a href="https://github.com/SarthakKrishak" target="_blank" rel="noreferrer" className="font-medium hover:underline" style={{ color: "var(--text-strong)" }}>Sarthak Krishak</a>
              <span style={{ color: "var(--border-strong)" }}>·</span>
              <span>Built for speed</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono" style={{ color: "var(--text-faint)" }}>
              <span className="hidden sm:inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E" }} /> Operational</span>
              <span className="flex items-center gap-1"><span className="kbd">Tab</span> + <span className="kbd">Enter</span></span>
              <a href="https://github.com/SarthakKrishak/Typecraft" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline" style={{ color: "var(--text-dim)" }}>
                ★ Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AnalyticsView({ history }: { history: Result[] }) {
  const avg = history.length ? Math.round(history.reduce((a, b) => a + b.wpm, 0) / history.length) : 0;
  const best = history.length ? Math.max(...history.map((h) => h.wpm)) : 0;
  const accAvg = history.length ? Math.round(history.reduce((a, b) => a + b.accuracy, 0) / history.length) : 0;
  const totalTime = history.reduce((a, b) => a + b.time, 0);
  const consistencyAvg = history.length ? Math.round(history.reduce((a, b) => a + b.consistency, 0) / history.length) : 0;
  const replayable = history.filter((r) => r.replay && r.replay.length > 4);
  const [theaterOpen, setTheaterOpen] = useState(false);
  const [theaterRun, setReplayRunLocal] = useState<Result | null>(null);
  const [showCalc, setShowCalc] = useState(false);

  // data for trend (last 20 runs)
  const trend = history.slice(0, 20).reverse().map((r, i) => ({ idx: i + 1, wpm: r.wpm, raw: r.rawWpm, acc: r.accuracy }));
  const lastRun = history[0];

  return (
    <div data-tour="analytics" className="w-full max-w-[740px] mx-auto px-4 py-2 space-y-4">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text-strong)" }}>Analytics</h2>
          {replayable.length > 0 && (
            <select
              onChange={(e) => { const run = replayable.find((r) => r.id === e.target.value); if (run) setReplayRunLocal(run); }}
              className="h-7 px-2 rounded-md text-[11px] font-medium border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}
            >
              {replayable.slice(0, 20).map((r) => (
                <option key={r.id} value={r.id}>{r.wpm} WPM · {new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</option>
              ))}
            </select>
          )}
          {replayable.length > 0 && (
            <button
              onClick={() => setTheaterOpen(true)}
              className="h-7 px-3 rounded-md text-[11px] font-semibold"
              style={{ background: "var(--primary)", color: "white" }}
            >
              ▶ Replay Theater
            </button>
          )}
          <Wrapped />
        </div>
        <span className="text-[11px] font-mono px-2 py-1 rounded-md border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>{history.length} runs • {Math.round(totalTime)}s typed</span>
      </div>
      {theaterOpen && theaterRun && (
        <ReplayTheater run={theaterRun} words={reconstructWords(theaterRun)} onClose={() => setTheaterOpen(false)} />
      )}

      {/* Hero — current level, big & readable */}
      <div className="panel p-5 flex flex-wrap items-center justify-between gap-4" style={{ background: "linear-gradient(135deg, var(--bg-highlight), var(--bg-card))" }}>
        <div>
          <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Your average</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-[44px] font-bold tracking-tighter leading-none" style={{ color: "var(--text-strong)" }}>{avg || "—"}</span>
            <span className="text-[14px] font-medium" style={{ color: "var(--text-dim)" }}>WPM</span>
          </div>
          {history.length > 1 && (() => {
            const recent = history.slice(0, Math.min(5, history.length)).reduce((a, b) => a + b.wpm, 0) / Math.min(5, history.length);
            const older = history.slice(Math.min(5, history.length), Math.min(15, history.length));
            const oldAvg = older.length ? older.reduce((a, b) => a + b.wpm, 0) / older.length : null;
            const delta = oldAvg ? Math.round(recent - oldAvg) : null;
            return delta !== null && delta !== 0 ? (
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: delta > 0 ? "rgba(16,185,129,0.12)" : "rgba(229,72,77,0.10)", color: delta > 0 ? "#10B981" : "var(--danger)" }}>
                {delta > 0 ? "↑" : "↓"} {Math.abs(delta)} WPM vs earlier runs
              </span>
            ) : null;
          })()}
        </div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-right">
          <div><div className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Best</div><div className="font-mono text-[18px] font-bold" style={{ color: "var(--primary)" }}>{best || "—"}</div></div>
          <div><div className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Accuracy</div><div className="font-mono text-[18px] font-bold" style={{ color: accAvg >= 97 ? "#10B981" : "var(--text-strong)" }}>{accAvg || "—"}%</div></div>
          <div><div className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Consist.</div><div className="font-mono text-[18px] font-bold" style={{ color: consistencyAvg >= 90 ? "#10B981" : "var(--text-strong)" }}>{consistencyAvg || "—"}%</div></div>
          <div><div className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Runs</div><div className="font-mono text-[18px] font-bold" style={{ color: "var(--text-strong)" }}>{history.length}</div></div>
          <div><div className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Time</div><div className="font-mono text-[18px] font-bold" style={{ color: "var(--text-strong)" }}>{totalTime >= 60 ? `${Math.floor(totalTime / 60)}m` : ""}{Math.round(totalTime % 60)}s</div></div>
          <div><div className="text-[9px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Chars</div><div className="font-mono text-[18px] font-bold" style={{ color: "var(--text-strong)" }}>{history.reduce((a, b) => a + b.correctChars, 0).toLocaleString()}</div></div>
        </div>
      </div>

      {history.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Progress</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>Each bar = one run • hover for WPM</div>
              </div>
            </div>
            <div className="h-[150px]">
              <div className="flex items-end gap-1 h-full">
                {trend.map((d) => (
                  <div key={d.idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <span className="text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity mb-1" style={{ color: "var(--text-strong)" }}>{d.wpm}</span>
                    <div
                      className="w-full rounded-t-sm transition-all duration-200 group-hover:opacity-100"
                      style={{ height: `${Math.max(4, (d.wpm / Math.max(10, best)) * 100)}%`, background: d.wpm === best ? "var(--primary)" : "color-mix(in srgb, var(--primary) 45%, var(--border-strong))", opacity: d.wpm === best ? 1 : 0.75 }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px]" style={{ color: "var(--text-faint)" }}>
              <span>oldest</span><span>{trend.length} runs</span><span>latest →</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: "var(--text-dim)" }}>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: "var(--primary)" }} /> personal best ({best})</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: "color-mix(in srgb, var(--primary) 45%, var(--border-strong))" }} /> run</span>
            </div>
          </div>

          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Last run — speed per second</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>{lastRun ? `${lastRun.mode} ${lastRun.time}s • ${lastRun.wpm} WPM • ${lastRun.accuracy}%` : ""}</div>
              </div>
            </div>
            {lastRun && lastRun.wpmHistory.length > 0 ? (
              <>
                <div className="h-[130px] flex items-end gap-0.5">
                  {lastRun.wpmHistory.map((w, i) => {
                    const maxW = Math.max(1, ...lastRun.wpmHistory);
                    return (
                      <div key={i} className="flex-1 rounded-t-sm relative group" title={`sec ${i + 1}: ${w} WPM`} style={{ height: `${Math.max(4, (w / maxW) * 100)}%`, background: w >= lastRun.burst * 0.95 ? "var(--accent-light)" : "color-mix(in srgb, var(--primary) 80%, transparent)", minHeight: 3 }} />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1.5 text-[9px] font-mono" style={{ color: "var(--text-faint)" }}>
                  <span>0s</span><span>{Math.floor(lastRun.wpmHistory.length / 2)}s</span><span>{lastRun.wpmHistory.length}s</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center" style={{ borderColor: "var(--border)" }}>
                  <div><div className="text-[9px] tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Peak</div><div className="font-mono text-[14px] font-bold" style={{ color: "var(--accent-light)" }}>{lastRun.burst}</div></div>
                  <div><div className="text-[9px] tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Raw</div><div className="font-mono text-[14px] font-bold" style={{ color: "var(--text-strong)" }}>{lastRun.rawWpm}</div></div>
                  <div><div className="text-[9px] tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Errors</div><div className="font-mono text-[14px] font-bold" style={{ color: lastRun.incorrectChars > 0 ? "var(--danger)" : "#10B981" }}>{lastRun.incorrectChars + lastRun.extraChars}</div></div>
                </div>
              </>
            ) : (
              <div className="text-[12px] py-8 text-center" style={{ color: "var(--text-dim)" }}>No data yet</div>
            )}
          </div>
        </div>
      ) : (
        <div className="panel p-8 text-center" style={{ background: "var(--bg-highlight)", borderColor: "var(--primary-border)" }}>
          <div className="text-[13px] font-semibold" style={{ color: "var(--text-strong)" }}>No data yet</div>
          <div className="text-[11px] mt-1 max-w-[360px] mx-auto leading-relaxed" style={{ color: "var(--text-dim)" }}>Run a test to populate analytics. Everything stays local, readable with high contrast and subtle tints — important numbers use <span style={{ color: "var(--text-strong)", fontWeight: 600 }}>strong 600 weight</span> for accessibility.</div>
        </div>
      )}

      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Error heatmap • keyboard</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>Where your fingers slip — aggregated from last 20 runs. Hover a key for finger & count.</div>
          </div>
        </div>
        {(() => {
          const charMap: Record<string, number> = {};
          let totalErrors = 0;
          history.slice(0, 20).forEach((r) => {
            Object.entries(r.charErrorMap || {}).forEach(([k, v]) => { charMap[k] = (charMap[k] || 0) + v; totalErrors += v; });
          });
          if (totalErrors === 0) {
            return (
              <div className="py-8 text-center rounded-md border border-dashed" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)", color: "var(--text-dim)" }}>
                <span className="text-[13px] font-medium">No error data yet</span>
                <span className="block text-[11px] mt-1">Complete a few tests — the heatmap fills in as you type.</span>
              </div>
            );
          }
          return <KeyboardDiagram charErrorMap={charMap} totalErrors={totalErrors} />;
        })()}
      </div>

      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Finger & Bigram Deep Analytics</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-faint)" }}>Which finger slips most, and which letter-pairs trip you up.</div>
          </div>
        </div>
        {(() => {
          const charMap: Record<string, number> = {};
          const bigramMap: Record<string, number> = {};
          history.slice(0, 20).forEach((r) => {
            Object.entries(r.charErrorMap || {}).forEach(([k, v]) => { charMap[k] = (charMap[k] || 0) + v; });
            Object.entries(r.bigramErrorMap || {}).forEach(([k, v]) => { bigramMap[k] = (bigramMap[k] || 0) + v; });
          });
          const fingerMap: Record<string, number> = {};
          const fingerOf = (k: string) => {
            if ("qaz".includes(k)) return "L-pinky";
            if ("wsx".includes(k)) return "L-ring";
            if ("edc".includes(k)) return "L-middle";
            if ("rfvtgb".includes(k)) return "L-index";
            if ("yhnujm".includes(k)) return "R-index";
            if ("ik,".includes(k)) return "R-middle";
            if ("ol.".includes(k)) return "R-ring";
            if ("p;/[".includes(k)) return "R-pinky";
            return "thumb";
          };
          Object.entries(charMap).forEach(([k, v]) => { const f = fingerOf(k); fingerMap[f] = (fingerMap[f] || 0) + v; });
          const topBigrams = Object.entries(bigramMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
          const maxFinger = Math.max(1, ...Object.values(fingerMap));
          return (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-medium mb-2" style={{ color: "var(--text-dim)" }}>Errors by finger (last 20 runs)</div>
                <div className="space-y-1.5">
                  {Object.entries(fingerMap).sort((a, b) => b[1] - a[1]).map(([f, v]) => (
                    <div key={f} className="flex items-center gap-2 text-[11px]">
                      <span className="w-20 font-mono" style={{ color: "var(--text-dim)" }}>{f}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
                        <div className="h-full" style={{ width: `${(v / maxFinger) * 100}%`, background: v === Math.max(...Object.values(fingerMap)) ? "var(--danger)" : "var(--border-strong)" }} />
                      </div>
                      <span className="w-6 text-right font-mono" style={{ color: "var(--text-strong)" }}>{v}</span>
                    </div>
                  ))}
                  {Object.keys(fingerMap).length === 0 && <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>No finger data yet — complete tests to populate.</span>}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium mb-2" style={{ color: "var(--text-dim)" }}>Top error bigrams</div>
                <div className="space-y-1">
                  {topBigrams.length === 0 ? <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>No bigram errors yet.</span> : topBigrams.map(([bg, cnt]) => (
                    <div key={bg} className="flex items-center justify-between px-2 py-1.5 rounded-md border text-[11px] font-mono" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-strong)" }}>
                      <span>{bg}</span><span style={{ color: "var(--danger)" }}>{cnt} ×</span>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] mt-2" style={{ color: "var(--text-faint)" }}>Bigrams like “th” “he” show where you stumble — drill them via Weak-Key Coach below test.</div>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="panel p-0 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}>
          <div>
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Recent runs</span>
            <span className="block text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>Best run highlighted • hover rows for detail</span>
          </div>
          <span className="text-[11px] font-mono" style={{ color: "var(--text-faint)" }}>{history.length} total</span>
        </div>
        <div className="max-h-[300px] overflow-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10" style={{ background: "var(--bg-muted)", color: "var(--text-faint)" }}>
              <tr className="text-[9px] tracking-widest uppercase">
                <th className="text-left font-semibold px-3 py-2">When</th>
                <th className="text-right font-semibold px-3 py-2">WPM</th>
                <th className="text-right font-semibold px-3 py-2">Raw</th>
                <th className="text-right font-semibold px-3 py-2">Acc</th>
                <th className="text-right font-semibold px-3 py-2">Consist.</th>
                <th className="text-right font-semibold px-3 py-2">Time</th>
                <th className="text-left font-semibold px-3 py-2 hidden sm:table-cell">Mode</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8" style={{ color: "var(--text-dim)" }}>No runs yet — complete a test and it appears here instantly (stored locally).</td></tr>
              ) : history.slice(0, 30).map((r) => (
                <tr key={r.id} className="border-t transition-colors" style={{ borderColor: "var(--border)", background: r.wpm === best ? "var(--bg-highlight)" : "transparent" }} title={`${r.correctChars} correct · ${r.incorrectChars} incorrect · ${r.extraChars} extra · ${r.missedChars} missed`}>
                  <td className="px-3 py-2 font-mono text-[11px] whitespace-nowrap" style={{ color: "var(--text-dim)" }}>{new Date(r.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })} <span className="hidden md:inline opacity-70">{new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></td>
                  <td className="px-3 py-2 text-right font-mono text-[13px] font-bold" style={{ color: r.wpm === best ? "var(--primary)" : "var(--text-strong)" }}>{r.wpm}{r.wpm === best && <span className="ml-1 text-[9px]" title="Personal best">★</span>}</td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--text-dim)" }}>{r.rawWpm}</td>
                  <td className="px-3 py-2 text-right font-mono font-medium" style={{ color: r.accuracy >= 97 ? "#10B981" : r.accuracy < 90 ? "var(--danger)" : "var(--text-strong)" }}>{r.accuracy}%</td>
                  <td className="px-3 py-2 text-right font-mono hidden sm:table-cell" style={{ color: "var(--text-dim)" }}>{r.consistency}%</td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--text-dim)" }}>{r.time}s</td>
                  <td className="px-3 py-2 hidden sm:table-cell font-mono text-[10px]" style={{ color: "var(--text-faint)" }}>{r.mode}·{r.language}{r.punctuation ? "+p" : ""}{r.numbers ? "+n" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* How we calculate */}
      <div className="panel overflow-hidden">
        <button
          onClick={() => setShowCalc((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
          style={{ background: "var(--bg-subtle)" }}
        >
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>How we calculate</span>
          <span className="text-[10px] transition-transform" style={{ color: "var(--text-faint)", transform: showCalc ? "rotate(180deg)" : "none" }}>▾</span>
        </button>
        {showCalc && (
          <div className="px-4 py-4 space-y-3 text-[12px] leading-relaxed">
            {[
              ["WPM", "(correct characters ÷ 5) ÷ (time in seconds ÷ 60)", "Counts only correctly typed characters, including spaces between correct words. This is the industry-standard net WPM — same formula Monkeytype and 10FastFingers use."],
              ["Raw WPM", "(all typed characters ÷ 5) ÷ (time in seconds ÷ 60)", "Counts every character you typed, including incorrect ones. The gap between WPM and Raw shows how much speed you lose to errors."],
              ["Accuracy", "correct ÷ (correct + incorrect + extra + missed) × 100", "Missed characters (skipped words) count against you. Extra characters you typed beyond the target also reduce accuracy."],
              ["Consistency", "(1 − std-dev ÷ mean) × 100 of per-second WPM", "Measures how even your speed was. A score of 90%+ means you type at a very steady pace. Zero-speed seconds (before you start) are excluded."],
              ["Burst", "highest single-second WPM", "Your fastest moment during the test. Compare it to your average — a big gap means you sprint and stall."],
            ].map(([name, formula, desc]) => (
              <div key={name} className="flex gap-3">
                <span className="font-mono font-semibold text-[12px] w-20 shrink-0 pt-0.5" style={{ color: "var(--accent-light)" }}>{name}</span>
                <div>
                  <code className="text-[11px] px-1.5 py-0.5 rounded-[3px] block mb-0.5" style={{ background: "var(--bg-muted)", color: "var(--text-strong)" }}>{formula}</code>
                  <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>{desc}</span>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}>
              All calculations run locally in your browser. No data is sent anywhere.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Reconstruct plausible words for replay playback from stored metadata.
// We regenerate a word list of matching total char count — keystroke timing is
// what matters for the theater; exact chars come from the run's own history length.
function reconstructWords(run: Result): string[] {
  const targetChars = Math.max(10, Math.round((run.wpm * 5 * run.time) / 60) + run.incorrectChars + run.missedChars);
  const pool = ["the","of","and","to","in","is","you","that","it","he","was","for","on","are","as","with","his","they","i","at","be","this","have","from","or","one","had","by","word","but","not","what","all","were","we","when","your","can","said","there","use","an","each","which","she","do","how","their","if","will"];
  const words: string[] = [];
  let len = 0;
  let i = 0;
  while (len < targetChars && i < 500) { const w = pool[i % pool.length]; words.push(w); len += w.length + 1; i++; }
  return words;
}

