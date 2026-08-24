import { useMemo, useState } from "react";
import { COMMON_WORDS } from "../data/words";
import { useDailyStore, mulberry32, todayKey } from "../store/useDailyStore";

// Daily Challenge — same seeded words worldwide, local streaks
export function DailyChallenge({ onStart, active, doneResult }: { onStart: (words: string[]) => void; active: boolean; doneResult?: { wpm: number; accuracy: number } | null }) {
  const daily = useDailyStore();
  const today = todayKey();
  const done = daily.todayDone(today);
  const [justDone, setJustDone] = useState<{ wpm: number; accuracy: number; streak: number } | null>(null);

  // record when a finished result arrives
  if (active && doneResult && !justDone) {
    const res = daily.record(today, doneResult.wpm, doneResult.accuracy);
    setJustDone(res ? { ...doneResult, streak: res.streak } : { ...doneResult, streak: daily.streak });
  }

  const words = useMemo(() => {
    let h = 0;
    for (const ch of today) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = mulberry32(h);
    const out: string[] = [];
    for (let i = 0; i < 25; i++) out.push(COMMON_WORDS[Math.floor(rnd() * COMMON_WORDS.length)]);
    return out;
  }, [today]);

  const share = (wpm: number, acc: number) => {
    navigator.clipboard.writeText(`DAY ${daily.streak} — ${wpm} WPM at ${acc}% on today's typecheck challenge`).catch(() => {});
  };

  return (
    <div className="panel p-4 mb-4" style={{ background: "linear-gradient(135deg, var(--bg-highlight), var(--bg-card))", borderColor: "var(--primary-border)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-strong)" }}>Daily Challenge</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>STREAK {daily.streak}{daily.bestStreak > daily.streak ? ` · best ${daily.bestStreak}` : ""}</span>
          </div>
          <div className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>
            Same 25 words for everyone today. One shot counts toward the streak.
          </div>
        </div>
        {!done ? (
          <button onClick={() => onStart(words)} disabled={active} className="h-8 px-4 rounded-md text-[12px] font-semibold disabled:opacity-60" style={{ background: "var(--primary)", color: "white" }}>
            {active ? "In progress…" : "Start today's →"}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono font-bold" style={{ color: "#10B981" }}>✓ {daily.bestToday(today)} WPM today</span>
            <button onClick={() => share(daily.bestToday(today), 100)} className="h-7 px-3 rounded-md text-[11px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>Share</button>
          </div>
        )}
      </div>

      {(justDone || doneResult) && (
        <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <span className="text-[12px] font-medium" style={{ color: "var(--text-strong)" }}>
            Recorded — streak is now <b>{justDone?.streak ?? daily.streak}</b>
          </span>
          <button onClick={() => share(justDone?.wpm ?? doneResult!.wpm, justDone?.accuracy ?? doneResult!.accuracy)} className="h-7 px-3 rounded-md text-[11px] font-medium" style={{ background: "var(--primary)", color: "white" }}>Copy & brag</button>
        </div>
      )}
    </div>
  );
}
