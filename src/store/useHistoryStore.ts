import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Result } from "../engine/stats";

function isValidResult(r: unknown): r is Result {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    Number.isFinite(o.wpm) && Number.isFinite(o.rawWpm) &&
    Number.isFinite(o.accuracy) && Number.isFinite(o.time) &&
    Number.isFinite(o.timestamp) &&
    Array.isArray(o.wpmHistory) && Array.isArray(o.rawHistory) &&
    (o.wpmHistory as unknown[]).length <= 3600 &&
    (typeof o.replay === "undefined" || (Array.isArray(o.replay) && (o.replay as unknown[]).length <= 1200))
  );
}

function sanitizeResults(input: unknown): Result[] {
  if (!Array.isArray(input)) return [];
  return (input as unknown[])
    .filter(isValidResult)
    .map((r) => ({
      ...r,
      wpm: Math.max(0, Math.min(400, Math.round(r.wpm))),
      rawWpm: Math.max(0, Math.min(500, Math.round(r.rawWpm))),
      accuracy: Math.max(0, Math.min(100, r.accuracy)),
      consistency: Number.isFinite(r.consistency) ? Math.max(0, Math.min(100, r.consistency)) : 0,
      burst: Number.isFinite(r.burst) ? Math.max(0, Math.min(500, Math.round(r.burst))) : r.wpm,
      wpmHistory: (r.wpmHistory as number[]).filter(Number.isFinite).slice(0, 3600),
      rawHistory: (r.rawHistory as number[]).filter(Number.isFinite).slice(0, 3600),
      // Backfill for runs recorded before the keystroke counter existed
      keystrokes: Number.isFinite((r as Result).keystrokes)
        ? (r as Result).keystrokes
        : r.correctChars + r.incorrectChars + r.extraChars,
    }))
    .slice(0, 200);
}

type HistoryState = {
  results: Result[];
  addResult: (r: Result) => void;
  clear: () => void;
  bestWpm: () => number;
  avgWpm: () => number;
};

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      results: [],
      addResult: (r) => set((s) => ({ results: [r, ...s.results].slice(0, 200) })),
      clear: () => set({ results: [] }),
      bestWpm: () => Math.max(0, ...get().results.map((r) => r.wpm)),
      avgWpm: () => {
        const rs = get().results;
        if (rs.length === 0) return 0;
        return Math.round(rs.reduce((a, b) => a + b.wpm, 0) / rs.length);
      },
    }),
    { name: "typing-history-v2", version: 2,
      // NOTE: storage key is legacy ("typing-history"); brand is "typecheck".
      // Keys are intentionally NOT renamed to avoid wiping existing users.
      merge: (persisted, current) => {
        const p = persisted as Partial<HistoryState>;
        if (!p || !Array.isArray(p.results)) return current;
        return { ...current, results: sanitizeResults(p.results) };
      },
    }
  )
);
