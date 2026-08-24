import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "midnight" | "forest" | "rose";
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
      theme: "dark",
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
      name: "typing-settings-v8",
      migrate: (persisted: unknown) => {
        const p = persisted as Partial<SettingsState> & Record<string, unknown>;
        if (p.soundKeys === undefined) p.soundKeys = false;
        if (p.soundWords === undefined) p.soundWords = false;
        if (p.adaptive === undefined) p.adaptive = false;
        if (p.focusMode === undefined) p.focusMode = false;
        if (p.dyslexia === undefined) p.dyslexia = false;
        if (p.highContrast === undefined) p.highContrast = false;
        if (p.breathing === undefined) p.breathing = false;
        if ((p as Record<string, unknown>).ghost === undefined) (p as Record<string, unknown>).ghost = false;
        if ((p as Record<string, unknown>).ghostWpm === undefined) (p as Record<string, unknown>).ghostWpm = 0;
        if ((p as Record<string, unknown>).handGuide === undefined) (p as Record<string, unknown>).handGuide = false;
        if ((p as Record<string, unknown>).rhythm === undefined) (p as Record<string, unknown>).rhythm = false;
        if (p.soundOnClick === undefined) p.soundOnClick = false;
        return p as SettingsState;
      },
      version: 8,
    }
  )
);
