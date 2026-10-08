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
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        const validThemes: Theme[] = ["graphite", "dark", "light", "midnight", "forest", "rose"];
        const validModes: TestMode[] = ["time", "words", "quote", "zen", "custom"];
        const validTimes = [15, 30, 60, 120] as const;
        const validWords = [10, 25, 50, 100] as const;
        const out = { ...current, ...p };
        if (!validThemes.includes(out.theme)) out.theme = current.theme;
        if (!validModes.includes(out.mode)) out.mode = current.mode;
        if (!validTimes.includes(out.time as never)) out.time = current.time;
        if (!validWords.includes(out.words as never)) out.words = current.words;
        if (out.language !== "english" && out.language !== "code") out.language = current.language;
        if (!["line", "block", "underline"].includes(out.caretStyle)) out.caretStyle = current.caretStyle;
        if (!Number.isFinite(out.fontSize)) out.fontSize = current.fontSize;
        else out.fontSize = Math.max(12, Math.min(48, Math.round(out.fontSize)));
        if (typeof out.customText !== "string") out.customText = current.customText;
        else out.customText = out.customText.slice(0, 8000);
        if (!Number.isFinite(out.ghostWpm) || out.ghostWpm < 0) out.ghostWpm = 0;
        else out.ghostWpm = Math.min(300, Math.round(out.ghostWpm));
        for (const k of ["blindMode","stopOnWord","soundOnClick","soundKeys","soundWords","adaptive","focusMode","dyslexia","highContrast","breathing","ghost","handGuide","rhythm","punctuation","numbers"] as const) {
          if (typeof out[k] !== "boolean") (out as Record<string, unknown>)[k] = current[k];
        }
        return out;
      },
    }
  )
);
