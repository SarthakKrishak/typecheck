// oxlint-disable-next-line react(purity) -- Math.random for drill shuffle is intentional, stable via useMemo
import { useMemo } from "react";
import { useHistoryStore } from "../store/useHistoryStore";
import { useDeckStore } from "../store/useDeckStore";
import { COMMON_WORDS } from "../data/words";

const QWERTY = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

function getFinger(key: string): string {
  const leftPinky = new Set(["q", "a", "z"]);
  const leftRing = new Set(["w", "s", "x"]);
  const leftMiddle = new Set(["e", "d", "c"]);
  const leftIndex = new Set(["r", "f", "v", "t", "g", "b"]);
  const rightIndex = new Set(["y", "h", "n", "u", "j", "m"]);
  const rightMiddle = new Set(["i", "k", ","]);
  const rightRing = new Set(["o", "l", "."]);
  const rightPinky = new Set(["p", ";", "/", "[", "]"]);
  if (leftPinky.has(key)) return "L-pinky";
  if (leftRing.has(key)) return "L-ring";
  if (leftMiddle.has(key)) return "L-middle";
  if (leftIndex.has(key)) return "L-index";
  if (rightIndex.has(key)) return "R-index";
  if (rightMiddle.has(key)) return "R-middle";
  if (rightRing.has(key)) return "R-ring";
  if (rightPinky.has(key)) return "R-pinky";
  return "thumb";
}

// Smart Sentence Coach — weave weak keys/bigrams into natural sentences (offline)
function buildSentences(weakKeys: string[], weakBigrams: string[]): string[] {
  const targets = [...weakBigrams, ...weakKeys].map((t) => t.toLowerCase());
  if (!targets.length) return [];
  const pool = COMMON_WORDS.filter((w) => targets.some((t) => w.includes(t)));
  const filler = ["the", "and", "with", "from", "that", "this", "when", "they", "have", "will", "into", "your", "just", "over", "than", "then", "some", "time", "work", "make"];
  const pick = (arr: string[], r: number) => arr[Math.floor(r * arr.length)] || "the";
  const templates = [
    (a: string, b: string) => `The ${a} and the ${b} went together toward the ${pick(pool, 0.4)} station.`,
    (a: string, b: string) => `When you ${a} the ${b}, remember that every small ${pick(pool, 0.6)} matters.`,
    (a: string, b: string) => `They said the ${a} was near the ${b}, just past the old ${pick(pool, 0.3)} bridge.`,
    (a: string, b: string) => `Practice with the ${a}, then rest; the ${b} will feel natural by morning.`,
  ];
  const out: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = pick(pool.length ? pool : filler, Math.random());
    let b = pick(pool.length ? pool : filler, Math.random());
    if (b === a) b = pick(filler, Math.random());
    out.push(templates[i % templates.length](a, b));
  }
  return out;
}

export function WeakKeyCoach({ onDrill }: { onDrill?: (words: string[]) => void }) {
  const history = useHistoryStore((s) => s.results);
  const deck = useDeckStore();

  const { aggregatedChar, aggregatedBigram, totalErrors } = useMemo(() => {
    const char: Record<string, number> = {};
    const bigram: Record<string, number> = {};
    let total = 0;
    history.slice(0, 10).forEach((r) => {
      Object.entries(r.charErrorMap || {}).forEach(([k, v]) => { char[k] = (char[k] || 0) + v; total += v; });
      Object.entries(r.bigramErrorMap || {}).forEach(([k, v]) => { bigram[k] = (bigram[k] || 0) + v; });
    });
    return { aggregatedChar: char, aggregatedBigram: bigram, totalErrors: total };
  }, [history]);

  const weakKeys = useMemo(() => Object.entries(aggregatedChar).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k), [aggregatedChar]);
  const weakBigrams = useMemo(() => Object.entries(aggregatedBigram).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k), [aggregatedBigram]);

  const drillWords = useMemo(() => {
    if (weakKeys.length === 0) return [];
    const filtered = COMMON_WORDS.filter((w) => weakKeys.some((k) => w.includes(k)));
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 25);
  }, [weakKeys]);

  if (history.length === 0) {
    return (
      <div className="panel p-5">
        <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Weak-Key Coach</div>
        <div className="text-[13px] mt-2" style={{ color: "var(--text-dim)" }}>Complete a test to see your weak keys. We’ll build a heatmap from your last 10 runs.</div>
      </div>
    );
  }

  const maxErr = Math.max(1, ...Object.values(aggregatedChar));

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Weak-Key Coach • Last 10 runs</span>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>{totalErrors} errors tracked</span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex gap-2 text-[11px]">
          {weakKeys.length > 0 ? weakKeys.map((k) => (
            <span key={k} className="px-2 py-1 rounded-md border font-mono font-bold" style={{ background: "var(--primary-soft)", borderColor: "var(--primary-border)", color: "var(--primary)" }}>{k.toUpperCase()}</span>
          )) : <span style={{ color: "var(--text-dim)" }}>No weak keys — great job!</span>}
          {weakBigrams.length > 0 && <span className="ml-2 flex items-center gap-1" style={{ color: "var(--text-dim)" }}>bigrams: <span className="font-mono" style={{ color: "var(--text-strong)" }}>{weakBigrams.join(", ")}</span></span>}
        </div>

        <div className="space-y-1.5">
          {QWERTY.map((row, ri) => (
            <div key={ri} className="flex gap-1 justify-center">
              {row.map((k) => {
                const cnt = aggregatedChar[k] || 0;
                const intensity = cnt / maxErr;
                const bg = cnt ? `color-mix(in srgb, var(--danger) ${Math.round(intensity * 45 + 8)}%, var(--bg-card))` : "var(--bg-muted)";
                const border = cnt ? `color-mix(in srgb, var(--danger) ${Math.round(intensity * 50 + 15)}%, var(--border))` : "var(--border)";
                const finger = getFinger(k);
                return (
                  <div key={k} className="w-7 h-7 rounded-md border flex flex-col items-center justify-center text-[11px] font-mono font-medium" style={{ background: bg, borderColor: border, color: cnt ? "var(--text-strong)" : "var(--text-dim)" }} title={`${k.toUpperCase()} • ${finger} • ${cnt} errors`}>
                    {k}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="flex justify-center gap-3 text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
            <span>L-pinky</span><span>·</span><span>R-index</span><span>·</span><span>intensity = error rate</span>
          </div>
        </div>

        {drillWords.length > 0 && (
          <div className="pt-3 border-t space-y-2" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px]" style={{ color: "var(--text-dim)" }}>Drill: <span className="font-mono" style={{ color: "var(--text-strong)" }}>{drillWords.slice(0, 3).join(" ")}…</span> ({drillWords.length} words)</span>
              <button onClick={() => onDrill?.(drillWords)} className="h-7 px-3 rounded-md text-[12px] font-medium shrink-0" style={{ background: "var(--primary)", color: "white" }}>Drill →</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => deck.addWords(drillWords)} className="h-6 px-2.5 rounded-md text-[11px] font-medium border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Save to deck (30% inject)</button>
              <button onClick={() => { const sents = buildSentences(weakKeys, weakBigrams); onDrill?.(sents.join(" ").split(/\s+/)); }} className="h-6 px-2.5 rounded-md text-[11px] font-medium" style={{ background: "var(--accent-light)", color: "#0A0A0B" }}>✨ Smart sentences</button>
              <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>{deck.words.length} in deck • {deck.enabled ? "auto-inject on" : "enable in prefs"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
