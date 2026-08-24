import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "graphite" | "dark" | "light" | "midnight" | "forest" | "rose";
export type CaretStyle = "line" | "block" | "underline";
export type TestMode = "time" | "words" | "quote" | "zen" | "custom";
export type Language = "english" | "code";

type SettingsState = {
  theme: Theme;
  caretStyle: CaretStyle;
  blindMode: boolean;
  stopOnWord: boolean;
  soundOnClick: boolean;
  soundKeys: boolean;
  soundWords: boolean;
  adaptive: boolean;
  focusMode: boolean;
  dyslexia: boolean;
  highContrast: boolean;
  breathing: boolean;
  ghost: boolean;
  ghostWpm: number;
  handGuide: boolean;
  rhythm: boolean;
  fontSize: number;
  mode: TestMode;
  time: 15 | 30 | 60 | 120;
  words: 10 | 25 | 50 | 100;
  language: Language;
  punctuation: boolean;
  numbers: boolean;
  customText: string;
  setTheme: (t: Theme) => void;
  setCaret: (c: CaretStyle) => void;
  toggle: (k: "blindMode" | "stopOnWord" | "punctuation" | "numbers" | "soundOnClick" | "soundKeys" | "soundWords" | "adaptive" | "focusMode" | "dyslexia" | "highContrast" | "breathing" | "ghost" | "handGuide" | "rhythm") => void;
  setMode: (m: TestMode) => void;
  setTime: (n: 15 | 30 | 60 | 120) => void;
  setWords: (n: 10 | 25 | 50 | 100) => void;
  setLanguage: (l: Language) => void;
  setFontSize: (n: number) => void;
  setCustomText: (t: string) => void;
  setGhostWpm: (n: number) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "graphite",
      caretStyle: "line",
      blindMode: false,
      stopOnWord: false,
      soundOnClick: false,
      soundKeys: false,
      soundWords: false,
      adaptive: false,
      focusMode: false,
      dyslexia: false,
      highContrast: false,
      breathing: false,
      ghost: false,
      ghostWpm: 0,
      handGuide: false,
      rhythm: false,
      fontSize: 24,
      mode: "time",
      time: 30,
      words: 50,
      language: "english",
      punctuation: false,
      numbers: false,
      customText: "The quick brown fox jumps over the lazy dog. Practice typing with your own text for best results.",
      setTheme: (theme) => set({ theme }),
      setCaret: (caretStyle) => set({ caretStyle }),
      toggle: (k) => set((s) => ({ [k]: !s[k] } as Partial<SettingsState>)),
      setMode: (mode) => set({ mode }),
      setTime: (time) => set({ time }),
      setWords: (words) => set({ words }),
      setLanguage: (language) => set({ language }),
      setFontSize: (fontSize) => set({ fontSize }),
      setCustomText: (customText) => set({ customText }),
      setGhostWpm: (ghostWpm) => set({ ghostWpm }),
    }),
    {
      name: "typing-settings-v9",
      migrate: (persisted: unknown) => {
        const p = persisted as Partial<SettingsState> & Record<string, unknown>;
        // v9: default theme changed from dark → graphite
        if (!p.theme || p.theme === "dark") p.theme = "graphite";
        return p as SettingsState;
      },
      version: 9,
    }
  )
);
