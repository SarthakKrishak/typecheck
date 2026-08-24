import { create } from "zustand";
import { persist } from "zustand/middleware";

type DeckState = {
  words: string[];
  enabled: boolean;
  addWords: (ws: string[]) => void;
  remove: (w: string) => void;
  clear: () => void;
  setEnabled: (v: boolean) => void;
};

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      words: [],
      enabled: true,
      addWords: (ws) => {
        const cur = new Set(get().words);
        ws.forEach((w) => cur.add(w.toLowerCase()));
        set({ words: Array.from(cur).slice(0, 100) });
      },
      remove: (w) => set({ words: get().words.filter((x) => x !== w) }),
      clear: () => set({ words: [] }),
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: "typecraft_deck_v1" }
  )
);
