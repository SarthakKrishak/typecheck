import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Result } from "../engine/stats";

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
    { name: "typing-history-v2" }
  )
);
