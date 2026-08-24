import { useEffect, useRef, useState } from "react";
import type { Result } from "../engine/stats";

type Props = { run: Result; words: string[] | null; onClose: () => void };

// Replay Theater — scrub through a recorded run keystroke-by-keystroke
export function ReplayTheater({ run, words, onClose }: Props) {
  const evts = run.replay ?? [];
  const duration = evts.length ? evts[evts.length - 1] + 400 : Math.round(run.time * 1000);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    if (!playing) return;
    lastTsRef.current = performance.now();
    const step = (now: number) => {
      const dt = now - lastTsRef.current;
      lastTsRef.current = now;
      setT((prev) => {
        const next = prev + dt;
        if (next >= duration) { setPlaying(false); return duration; }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, duration]);

  if (!words || !evts.length) return null;

  // binary search: how many keystrokes happened by time t
  let lo = 0, hi = evts.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (evts[mid] <= t) lo = mid + 1; else hi = mid; }
  const charsDone = lo;

  // map char count → word/char position
  let acc = 0, wIdx = 0, cIdx = 0;
  outer: for (let i = 0; i < words.length; i++) {
    for (let c = 0; c <= words[i].length; c++) {
      if (acc >= charsDone) { wIdx = i; cIdx = c; break outer; }
      acc++;
    }
  }

  // live WPM at this scrub point
  const elapsedSec = Math.max(0.001, t / 1000);
  const liveWpm = Math.round((charsDone / 5) / (elapsedSec / 60));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />
      <div className="relative w-full max-w-[860px] rounded-xl border overflow-hidden animate-[fadeIn_0.2s_ease]" style={{ background: "var(--bg-surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div>
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-strong)" }}>Replay Theater</span>
            <span className="block text-[11px] mt-0.5" style={{ color: "var(--text-dim)" }}>{run.wpm} WPM • {run.accuracy}% • {new Date(run.timestamp).toLocaleString()}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md border text-[12px]" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>×</button>
        </div>

        <div className="p-5">
          {/* film strip of words */}
          <div className="flex flex-wrap gap-x-1.5 gap-y-1.5 content-start overflow-hidden select-none" style={{ fontFamily: "var(--font-mono)", fontSize: 18, lineHeight: 1.75, maxHeight: 200 }}>
            {words.map((word, wi) => {
              const isPast = wi < wIdx, isCur = wi === wIdx;
              return (
                <span key={wi} className="inline-flex" style={{ padding: "1px 2px", borderRadius: 4, background: isCur ? "var(--bg-subtle)" : "transparent" }}>
                  {word.split("").map((ch, ci) => {
                    let cls = "char-pending";
                    if (isPast) cls = "char-correct";
                    else if (isCur && ci < cIdx) cls = "char-correct";
                    else if (isCur && ci === cIdx) cls = "caret-flash";
                    return <span key={ci} className={cls}>{ch}</span>;
                  })}
                </span>
              );
            })}
          </div>

          {/* transport controls */}
          <div className="mt-5 flex items-center gap-4">
            <button onClick={() => setPlaying((p) => !p)} className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] shrink-0 shadow-md" style={{ background: "var(--primary)", color: "white" }}>{playing ? "❚❚" : "▶"}</button>
            <input type="range" min={0} max={duration} value={t} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} className="flex-1 accent-[var(--primary)]" />
            <span className="font-mono text-[12px] shrink-0" style={{ color: "var(--text-strong)" }}>{(t / 1000).toFixed(1)}s</span>
          </div>

          {/* live stats at scrub point */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t text-center" style={{ borderColor: "var(--border)" }}>
            <div><div className="text-[9px] tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>WPM @ playhead</div><div className="font-mono text-[20px] font-bold" style={{ color: "var(--accent-light)" }}>{liveWpm}</div></div>
            <div><div className="text-[9px] tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Keystrokes</div><div className="font-mono text-[20px] font-bold" style={{ color: "var(--text-strong)" }}>{charsDone}</div></div>
            <div><div className="text-[9px] tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>Final</div><div className="font-mono text-[20px] font-bold" style={{ color: "var(--primary)" }}>{run.wpm} wpm</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
