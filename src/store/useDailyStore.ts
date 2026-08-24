import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DailyEntry = { date: string; wpm: number; accuracy: number };
type DailyState = {
  lastDate: string;
  streak: number;
  bestStreak: number;
  history: DailyEntry[];
  record: (date: string, wpm: number, accuracy: number) => { streak: number; isNewBest: boolean } | null;
  todayDone: (today: string) => boolean;
  bestToday: (today: string) => number;
};

function yesterday(date: string): string {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const useDailyStore = create<DailyState>()(
  persist(
    (set, get) => ({
      lastDate: "",
      streak: 0,
      bestStreak: 0,
      history: [],
      record: (date, wpm, accuracy) => {
        const s = get();
        if (s.lastDate === date && s.history.some((h) => h.date === date)) {
          // already done — keep best
          const existing = s.history.find((h) => h.date === date);
          if (existing && wpm > existing.wpm) {
            set({ history: s.history.map((h) => (h.date === date ? { ...h, wpm, accuracy } : h)) });
          }
          return null;
        }
        const continued = s.lastDate === yesterday(date);
        const streak = continued ? s.streak + 1 : 1;
        const bestStreak = Math.max(s.bestStreak, streak);
        set({
          lastDate: date,
          streak,
          bestStreak,
          history: [{ date, wpm, accuracy }, ...s.history].slice(0, 90),
        });
        return { streak, isNewBest: streak >= bestStreak };
      },
      todayDone: (today) => get().lastDate === today && get().history.some((h) => h.date === today),
      bestToday: (today) => get().history.find((h) => h.date === today)?.wpm ?? 0,
    }),
    { name: "typecraft_daily_v1" }
  )
);

// Deterministic PRNG — same words worldwide for a given seed
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
