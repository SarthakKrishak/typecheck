import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Result } from "../engine/stats";

// ─── Badge Definitions ───
// Each badge has an id, name, description, icon (emoji-free, typographic), tier, and a check function.

export type BadgeTier = "bronze" | "silver" | "gold" | "diamond";

export interface BadgeDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tier: BadgeTier;
}

export interface BadgeDefWithCheck extends BadgeDef {
  check: (results: Result[], streak: number) => boolean;
}

export const BADGE_DEFS: BadgeDefWithCheck[] = [
  // ─── First Steps ───
  { id: "first-test", name: "First Steps", desc: "Complete your first test", icon: "▶", tier: "bronze", check: (r) => r.length >= 1 },
  { id: "getting-warm", name: "Getting Warm", desc: "Complete 5 tests", icon: "5", tier: "bronze", check: (r) => r.length >= 5 },
  { id: "committed", name: "Committed", desc: "Complete 25 tests", icon: "25", tier: "silver", check: (r) => r.length >= 25 },
  { id: "veteran", name: "Veteran", desc: "Complete 100 tests", icon: "100", tier: "gold", check: (r) => r.length >= 100 },
  { id: "legend", name: "Legend", desc: "Complete 500 tests", icon: "500", tier: "diamond", check: (r) => r.length >= 500 },

  // ─── Speed ───
  { id: "wpm-40", name: "Cruising", desc: "Reach 40 WPM", icon: "40", tier: "bronze", check: (r) => r.some((x) => x.wpm >= 40) },
  { id: "wpm-60", name: "Quick Fingers", desc: "Reach 60 WPM", icon: "60", tier: "silver", check: (r) => r.some((x) => x.wpm >= 60) },
  { id: "wpm-80", name: "Speed Demon", desc: "Reach 80 WPM", icon: "80", tier: "gold", check: (r) => r.some((x) => x.wpm >= 80) },
  { id: "wpm-100", name: "Century", desc: "Reach 100 WPM", icon: "100", tier: "diamond", check: (r) => r.some((x) => x.wpm >= 100) },
  { id: "wpm-120", name: "Lightning", desc: "Reach 120 WPM", icon: "⚡", tier: "diamond", check: (r) => r.some((x) => x.wpm >= 120) },

  // ─── Accuracy ───
  { id: "acc-95", name: "Sharpshooter", desc: "Finish a test with 95%+ accuracy", icon: "95", tier: "bronze", check: (r) => r.some((x) => x.accuracy >= 95) },
  { id: "acc-98", name: "Sniper", desc: "Finish a test with 98%+ accuracy", icon: "98", tier: "silver", check: (r) => r.some((x) => x.accuracy >= 98) },
  { id: "acc-100", name: "Flawless", desc: "Finish a test with 100% accuracy", icon: "◎", tier: "gold", check: (r) => r.some((x) => x.accuracy >= 100) },

  // ─── Consistency ───
  { id: "cons-80", name: "Steady Hand", desc: "80%+ consistency", icon: "≈", tier: "bronze", check: (r) => r.some((x) => x.consistency >= 80) },
  { id: "cons-90", name: "Metronome", desc: "90%+ consistency", icon: "≡", tier: "silver", check: (r) => r.some((x) => x.consistency >= 90) },
  { id: "cons-95", name: "Machine", desc: "95%+ consistency", icon: "⬛", tier: "gold", check: (r) => r.some((x) => x.consistency >= 95) },

  // ─── Endurance ───
  { id: "time-120", name: "Marathon", desc: "Complete a 120-second test", icon: "2:00", tier: "silver", check: (r) => r.some((x) => x.mode === "time" && x.time >= 120) },
  { id: "time-600", name: "Iron Will", desc: "Type for 10 minutes total", icon: "10:00", tier: "silver", check: (r) => r.reduce((a, b) => a + b.time, 0) >= 600 },
  { id: "time-1800", name: "Ultra", desc: "Type for 30 minutes total", icon: "30:00", tier: "gold", check: (r) => r.reduce((a, b) => a + b.time, 0) >= 1800 },

  // ─── Streak ───
  { id: "streak-3", name: "On Fire", desc: "3-day daily challenge streak", icon: "3", tier: "bronze", check: (_r, streak) => streak >= 3 },
  { id: "streak-7", name: "Unstoppable", desc: "7-day daily challenge streak", icon: "7", tier: "gold", check: (_r, streak) => streak >= 7 },
  { id: "streak-30", name: "Immortal", desc: "30-day daily challenge streak", icon: "30", tier: "diamond", check: (_r, streak) => streak >= 30 },

  // ─── Special ───
  { id: "racer", name: "Racer", desc: "Join a race", icon: "⚑", tier: "bronze", check: () => { try { return !!localStorage.getItem("typecraft_race_rooms_v1"); } catch { return false; } } },
  { id: "custom-text", name: "Customizer", desc: "Use custom text mode", icon: "✎", tier: "bronze", check: (r) => r.some((x) => x.mode === "custom") },
  { id: "code-typist", name: "Code Typist", desc: "Type in code mode", icon: "{}", tier: "bronze", check: (r) => r.some((x) => x.language === "code") },
  { id: "punct-master", name: "Punctuator", desc: "Complete a test with punctuation on", icon: ";", tier: "silver", check: (r) => r.some((x) => x.punctuation) },
  { id: "wrapped", name: "Card Holder", desc: "View your Wrapped card", icon: "🂠", tier: "silver", check: () => { try { return !!localStorage.getItem("typecraft_card_name"); } catch { return false; } } },
];

// ─── Store ───
interface BadgeState {
  unlocked: Record<string, number>; // badgeId → timestamp
  latest: string[]; // last 3 unlocked ids (for header)
  evaluate: (results: Result[], streak: number) => string[]; // returns newly unlocked ids
}

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set, get) => ({
      unlocked: {},
      latest: [],
      evaluate: (results, streak) => {
        const current = get().unlocked;
        const newlyUnlocked: string[] = [];
        for (const def of BADGE_DEFS) {
          if (current[def.id]) continue;
          try {
            if (def.check(results, streak)) {
              newlyUnlocked.push(def.id);
            }
          } catch { /* skip broken checks */ }
        }
        if (newlyUnlocked.length === 0) return [];
        const now = Date.now();
        const next = { ...current };
        for (const id of newlyUnlocked) next[id] = now;
        // latest = last 3 by timestamp, newest first
        const allSorted = Object.entries(next).sort((a, b) => b[1] - a[1]).map(([id]) => id);
        set({ unlocked: next, latest: allSorted.slice(0, 3) });
        return newlyUnlocked;
      },
    }),
    { name: "typecheck_badges_v1" }
  )
);

// Re-export for UI consumption
export { BADGE_DEFS as DEFS };
