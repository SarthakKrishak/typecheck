import { ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart, Line } from "recharts";
import type { Result } from "../engine/stats";
import { useHistoryStore } from "../store/useHistoryStore";

export function ResultView({ result, onRestart, onNext }: { result: Result; onRestart: () => void; onNext: () => void }) {
  const best = useHistoryStore((s) => s.bestWpm());
  const isPB = result.wpm === best && best > 0;
  const data = result.wpmHistory.map((w, i) => ({ s: i + 1, wpm: w, raw: result.rawHistory[i] ?? w }));

  const copy = () => {
    const t = `${result.wpm} WPM · ${result.accuracy}% · ${result.mode} ${result.mode === "time" ? result.time + "s" : ""} — typecraft`;
    navigator.clipboard.writeText(t);
  };

  return (
    <div className="w-full max-w-[740px] mx-auto px-4 py-6 animate-[fadeIn_0.3s_ease]">
      {isPB && (
        <div className="mb-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-[12px] font-medium" style={{ background: "var(--primary-soft)", borderColor: "var(--primary-border)", color: "var(--primary)" }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--primary)" }} /> New personal best — {result.wpm} WPM
        </div>
      )}

      {/* Hero metric */}
      <div className="flex items-baseline gap-4 mb-6">
        <div className="font-mono text-[56px] font-[600] tracking-tighter leading-none" style={{ color: "var(--text-strong)" }}>
          {result.wpm}
          <span className="text-[18px] font-sans font-medium tracking-normal ml-2" style={{ color: "var(--text-dim)" }}>WPM</span>
        </div>
        <div className="hidden sm:block h-10 w-px" style={{ background: "var(--border)" }} />
        <div className="flex gap-6 text-[12px]">
          <span><span className="font-mono font-semibold" style={{ color: "var(--text-strong)" }}>{result.accuracy}%</span> <span style={{ color: "var(--text-dim)" }}>accuracy</span></span>
          <span><span className="font-mono font-semibold" style={{ color: "var(--text-strong)" }}>{result.rawWpm}</span> <span style={{ color: "var(--text-dim)" }}>raw</span></span>
          <span><span className="font-mono font-semibold" style={{ color: "var(--text-strong)" }}>{result.consistency}%</span> <span style={{ color: "var(--text-dim)" }}>consist.</span></span>
        </div>
      </div>

      {/* Metrics grid — data-dense, not cards */}
      <div className="grid grid-cols-3 gap-px rounded-lg overflow-hidden border mb-6" style={{ background: "var(--border)", borderColor: "var(--border)" }}>
        <Metric label="Time" value={`${result.time}s`} sub={`${result.mode} · ${result.language}`} />
        <Metric label="Characters" value={`${result.correctChars}/${result.incorrectChars}`} sub={`${result.extraChars} extra · ${result.missedChars} missed`} />
        <Metric label="Words" value={`${result.correctWords}/${result.correctWords + result.incorrectWords}`} sub={`burst ${result.burst} WPM`} />
      </div>

      {/* Chart — minimal */}
      <div className="panel p-4 md:p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>WPM over time</span>
          <span className="flex items-center gap-3 text-[11px] font-mono" style={{ color: "var(--text-dim)" }}>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded" style={{ background: "var(--primary)" }} />wpm</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 rounded border border-dashed" style={{ borderColor: "var(--text-faint)" }} />raw</span>
          </span>
        </div>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="wpmFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="2 4" />
              <XAxis dataKey="s" tick={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "var(--font-mono)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-faint)", fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-mono)", boxShadow: "var(--shadow-md)" }}
                cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
              />
              <Area type="monotone" dataKey="wpm" stroke="var(--primary)" strokeWidth={1.5} fill="url(#wpmFill)" dot={false} activeDot={{ r: 3, fill: "var(--primary)", stroke: "var(--bg-surface)", strokeWidth: 1.5 }} />
              <Line type="monotone" dataKey="raw" stroke="var(--text-faint)" strokeWidth={1} strokeDasharray="4 3" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actions — quiet, not pill circus */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onRestart} className="h-8 px-4 rounded-md text-[13px] font-medium flex items-center gap-1.5" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>
          Restart <span className="hidden sm:inline opacity-60 font-mono text-[11px]">↩</span>
        </button>
        <button onClick={onNext} className="h-8 px-4 rounded-md text-[13px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>
          Next
        </button>
        <button onClick={copy} className="h-8 px-3 rounded-md text-[13px] font-medium border" style={{ background: "transparent", borderColor: "var(--border)", color: "var(--text-dim)" }}>
          Copy result
        </button>
        <span className="ml-auto text-[11px] font-mono hidden sm:inline" style={{ color: "var(--text-faint)" }}>
          {result.mode} · {result.language}{result.punctuation ? " · punct" : ""}{result.numbers ? " · nums" : ""} · {new Date(result.timestamp).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="px-4 py-3" style={{ background: "var(--bg-card)" }}>
      <div className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-faint)" }}>{label}</div>
      <div className="font-mono text-[15px] font-semibold tracking-tight mt-1" style={{ color: "var(--text-strong)" }}>{value}</div>
      <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-dim)" }}>{sub}</div>
    </div>
  );
}
