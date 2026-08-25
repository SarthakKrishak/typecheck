import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import { useSettingsStore } from "../store/useSettingsStore";
import { calcWpm, calcRaw, calcAccuracy, calcConsistency } from "../engine/stats";
import type { Result } from "../engine/stats";
import { generateWords } from "../data/words";
import { QUOTES } from "../data/quotes";
import { playMechanical, playCorrectWord, playMetronome } from "../lib/sound";
import { emitTypingTick } from "../lib/events";
import { useDeckStore } from "../store/useDeckStore";
import { useHistoryStore } from "../store/useHistoryStore";
import { HandGuide } from "./HandGuide";

type Props = { onResult: (r: Result) => void; keyTrigger: number; drillWords?: string[] | null; onDrillDone?: () => void; fixedWords?: string[] | null };

export function TypingArea({ onResult, keyTrigger, drillWords, onDrillDone, fixedWords }: Props) {
  const settings = useSettingsStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);

  const [words, setWords] = useState<string[]>(() => gen(settings));
  const [input, setInput] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [extraChars, setExtraChars] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [raw, setRaw] = useState(0);
  const [isFocused, setIsFocused] = useState(true);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [rawHistory, setRawHistory] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [correctChars, setCorrectChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [extraCount, setExtraCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [wordStats, setWordStats] = useState<{ c: number; ic: number; ex: number; miss: number }[]>([]);
  const [capsOn, setCapsOn] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [fetchingCode, setFetchingCode] = useState(false);
  const charErrorRef = useRef<Record<string, number>>({});
  const bigramErrorRef = useRef<Record<string, number>>({});
  const replayRef = useRef<number[]>([]);
  const playTick = (ok: boolean) => {
    if (!settings.soundOnClick || !settings.soundKeys) return;
    playMechanical(ok);
  };
  const playWordCorrect = () => {
    if (!settings.soundOnClick || !settings.soundWords) return;
    playCorrectWord();
  };

  const [githubError, setGithubError] = useState<string | null>(null);
  const fetchGithub = async () => {
    const url = githubUrl.trim();
    if (!url) return;
    setFetchingCode(true);
    setGithubError(null);
    try {
      let rawUrl: URL;
      try { rawUrl = new URL(url); } catch { throw new Error("Invalid URL"); }
      // Only allow raw.githubusercontent.com or github.com blob URLs
      const isRaw = rawUrl.hostname === "raw.githubusercontent.com";
      const isBlob = rawUrl.hostname === "github.com" && rawUrl.pathname.includes("/blob/");
      if (!isRaw && !isBlob) throw new Error("Only GitHub file URLs are supported");
      const fetchUrl = isBlob
        ? url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")
        : url;
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const text = await res.text();
      if (!text) throw new Error("File is empty");
      settings.setCustomText(text.slice(0, 4000));
      setGithubUrl("");
    } catch (e) {
      setGithubError((e as Error).message);
    } finally { setFetchingCode(false); }
  };

  const getTokenStyle = (word: string): React.CSSProperties | undefined => {
    const isCode = settings.language === "code" || settings.mode === "custom";
    if (!isCode) return undefined;
    const keywords = new Set(["const","let","var","function","return","if","else","for","while","class","import","export","from","async","await","try","catch","new","this","super","extends","implements","interface","type","enum","default","break","continue","switch","case","yield","true","false","null","undefined"]);
    const clean = word.replace(/[^a-zA-Z0-9_]/g, "");
    if (keywords.has(clean)) return { color: "var(--primary)" };
    if (/^["'`].*["'`]$/.test(word) || word.includes('"') || word.includes("'")) return { color: "var(--success)" };
    if (word.startsWith("//") || word.startsWith("/*")) return { color: "var(--text-faint)" };
    if (/^[0-9]+$/.test(word)) return { color: "var(--warning)" };
    if (/^[A-Z][a-zA-Z0-9]*$/.test(clean) && clean.length > 1) return { color: "var(--accent-light)" };
    return undefined;
  };

  const timeLimit = settings.mode === "time" ? settings.time : 0;
  const wordsLimit = settings.mode === "words" ? settings.words : 0;

  function gen(s: typeof settings) {
    if (fixedWords && fixedWords.length > 0) return [...fixedWords];
    if (drillWords && drillWords.length > 0) return [...drillWords];
    if (s.mode === "quote") return QUOTES[Math.floor(Math.random() * QUOTES.length)].text.split(" ");
    if (s.mode === "custom") {
      const t = (s.customText || "").trim();
      if (!t) return ["paste", "your", "text", "in", "preferences", "to", "start", "custom", "test"];
      return t.split(/\s+/).filter(Boolean);
    }
    if (s.mode === "zen") return generateWords(200, { punctuation: s.punctuation, numbers: s.numbers, code: s.language === "code" });
    const count = s.mode === "words" ? s.words : 120;
    const base = generateWords(count, { punctuation: s.punctuation, numbers: s.numbers, code: s.language === "code" });
    const deck = useDeckStore.getState();
    if (deck.enabled && deck.words.length > 0 && (s.mode === "time" || s.mode === "words")) {
      const injectCount = Math.min(deck.words.length, Math.floor(count * 0.3));
      const shuffledDeck = [...deck.words].sort(() => Math.random() - 0.5).slice(0, injectCount);
      const out = [...base];
      for (let i = 0; i < injectCount; i++) {
        const idx = Math.floor(Math.random() * out.length);
        out[idx] = shuffledDeck[i % shuffledDeck.length];
      }
      return out;
    }
    return base;
  }

  const reset = useCallback(() => {
    const newWords = gen(useSettingsStore.getState());
    setWords(newWords); setInput(""); setWordIdx(0); setHistory([]); setExtraChars([]); setWordStats([]);
    charErrorRef.current = {}; bigramErrorRef.current = {}; replayRef.current = [];
    setStartTime(null); setElapsed(0); setWpm(0); setRaw(0); setWpmHistory([]); setRawHistory([]); setFinished(false);
    setCorrectChars(0); setIncorrectChars(0); setExtraCount(0); setMissedCount(0);
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [drillWords]);

  useEffect(() => { reset(); }, [keyTrigger, settings.mode, settings.time, settings.words, settings.language, settings.punctuation, settings.numbers, settings.customText, reset]);

  // Rhythm mode — metronome ticks + beat pulse event
  const beatRef = useRef<number>(0);
  useEffect(() => {
    if (!settings.rhythm || startTime === null || finished) return;
    const BPM = 90;
    const iv = window.setInterval(() => {
      beatRef.current = (beatRef.current + 1) % 4;
      playMetronome(beatRef.current === 0);
      window.dispatchEvent(new CustomEvent("typecraft-beat", { detail: { beat: beatRef.current } }));
    }, (60 / BPM) * 1000);
    return () => clearInterval(iv);
  }, [settings.rhythm, startTime, finished]);

  // Refs for timer — prevents interval from resetting on every keystroke
  const correctCharsRef = useRef(0);
  const incorrectCharsRef = useRef(0);
  const extraCountRef = useRef(0);
  const wpmHistoryLenRef = useRef(0);
  const finishRef = useRef<(e?: number) => void>(() => {});
  correctCharsRef.current = correctChars;
  incorrectCharsRef.current = incorrectChars;
  extraCountRef.current = extraCount;
  wpmHistoryLenRef.current = wpmHistory.length;

  useEffect(() => {
    if (startTime === null || finished) return;
    const id = window.setInterval(() => {
      const e = (Date.now() - startTime) / 1000;
      setElapsed(e);
      const el = Math.floor(e);
      const curWpm = calcWpm(correctCharsRef.current, e);
      const curRaw = calcRaw(correctCharsRef.current + incorrectCharsRef.current + extraCountRef.current, e);
      setWpm(curWpm); setRaw(curRaw);
      if (el > 0 && wpmHistoryLenRef.current < el) {
        setWpmHistory((h) => [...h, curWpm]); setRawHistory((h) => [...h, curRaw]);
        wpmHistoryLenRef.current = el;
        emitTypingTick(1);
      }
      if (settings.mode === "time" && e >= timeLimit) finishRef.current(e);
      window.dispatchEvent(new CustomEvent("typecraft-live", { detail: { wpm: curWpm, raw: curRaw, acc: liveAccRef.current, left: settings.mode === "time" ? Math.max(0, Math.ceil(timeLimit - e)) : null } }));
    }, 100);
    return () => clearInterval(id);
  }, [startTime, finished, timeLimit, settings.mode]);

  const finish = (finalElapsed?: number) => {
    if (finished) return;
    const e = finalElapsed ?? (startTime ? (Date.now() - startTime) / 1000 : 0);
    const finalMissed = missedCount + (() => {
      let missed = 0;
      if (wordIdx < words.length) {
        const cur = words[wordIdx] ?? "";
        if (input.length < cur.length) missed += cur.length - input.length;
        for (let i = wordIdx + 1; i < words.length; i++) if (settings.mode !== "time") missed += words[i].length + 1;
      }
      return missed;
    })();
    const finalWpm = calcWpm(correctChars, e);
    const finalRaw = calcRaw(correctChars + incorrectChars + extraCount, e);
    const acc = calcAccuracy(correctChars, incorrectChars, extraCount, finalMissed);
    const consistency = calcConsistency(wpmHistory.length ? wpmHistory : [finalWpm]);
    const burst = Math.max(0, ...wpmHistory, finalWpm);
    const charEntries = Object.entries(charErrorRef.current).sort((a, b) => b[1] - a[1]);
    const weakKeys = charEntries.slice(0, 3).map(([k]) => k);
    const bigramEntries = Object.entries(bigramErrorRef.current).sort((a, b) => b[1] - a[1]);
    const weakBigrams = bigramEntries.slice(0, 3).map(([k]) => k);
    const result: Result = {
      id: String(Date.now()), wpm: finalWpm, rawWpm: finalRaw, accuracy: acc,
      correctChars, incorrectChars, extraChars: extraCount, missedChars: finalMissed,
      correctWords: history.filter((w, i) => w === words[i]).length,
      incorrectWords: history.filter((w, i) => w !== words[i]).length,
      time: Math.round(e * 10) / 10, mode: settings.mode, language: settings.language,
      punctuation: settings.punctuation, numbers: settings.numbers,
      consistency, burst, wpmHistory: wpmHistory.length ? [...wpmHistory, finalWpm] : [finalWpm],
      rawHistory: rawHistory.length ? [...rawHistory, finalRaw] : [finalRaw],
      timestamp: Date.now(), textLength: words.join(" ").length,
      weakKeys, weakBigrams, charErrorMap: { ...charErrorRef.current }, bigramErrorMap: { ...bigramErrorRef.current },
      replay: replayRef.current.length > 2 ? [...replayRef.current] : undefined,
    };
    setFinished(true); onResult(result);
    if (drillWords) onDrillDone?.();
  };
  finishRef.current = finish;

  const handleInput = (val: string) => {
    if (finished) return;
    if (startTime === null) setStartTime(Date.now());
    // sound on keypress (per char) — mechanical, no delay, static import
    if (val.length > input.length) {
      const last = val[val.length - 1];
      const isSpace = last === " ";
      // replay recording — ms offset of every keystroke (cap 1200 events)
      if (startTime !== null && replayRef.current.length < 1200) replayRef.current.push(Math.round(Date.now() - startTime));
      if (!isSpace) {
        const cur = words[wordIdx] ?? "";
        const idx = val.length - 1;
        const expected = cur[idx];
        const ok = expected !== undefined && last === expected;
        playTick(ok);
      }
    }
    if (val.endsWith(" ")) {
      if (input.length === 0) { setInput(""); return; }
      if (settings.stopOnWord) {
        const cur = words[wordIdx] ?? ""; let err = false;
        for (let i = 0; i < cur.length; i++) if ((input[i] ?? "") !== cur[i]) { err = true; break; }
        if (err || input.length !== cur.length) return;
      }
      const typed = input; const target = words[wordIdx];
      let c = 0, ic = 0, ex = 0, miss = 0;
      const max = Math.max(typed.length, target.length);
      for (let i = 0; i < max; i++) {
        const t = target[i], tt = typed[i];
        if (i < target.length && i < typed.length) {
          if (t === tt) c++; else {
            ic++;
            const key = t.toLowerCase();
            charErrorRef.current[key] = (charErrorRef.current[key] || 0) + 1;
            if (i > 0) {
              const bg = (target[i - 1] + t).toLowerCase();
              if (/^[a-z]{2}$/.test(bg)) bigramErrorRef.current[bg] = (bigramErrorRef.current[bg] || 0) + 1;
            }
          }
        } else if (i >= target.length) ex++; else {
          miss++;
          const key = t.toLowerCase();
          charErrorRef.current[key] = (charErrorRef.current[key] || 0) + 1;
        }
      }
      setCorrectChars((x) => x + c); setIncorrectChars((x) => x + ic); setExtraCount((x) => x + ex); setMissedCount((x) => x + miss);
      setWordStats((ws) => [...ws, { c, ic, ex, miss }]); setCorrectChars((x) => x + 1);
      // satisfying sound only when whole word is correct — separate toggle, no delay
      const isWordCorrect = c === target.length && ic === 0 && ex === 0 && miss === 0;
      if (isWordCorrect) playWordCorrect();
      setHistory((h) => [...h, typed]); setExtraChars((e) => { const cpy = [...e]; cpy[wordIdx] = typed.slice(target.length); return cpy; });
      const n = wordIdx + 1; setWordIdx(n); setInput("");
      if (settings.mode === "words" && n >= wordsLimit) { const e = startTime ? (Date.now() - startTime) / 1000 : 0; setTimeout(() => finish(e), 0); }
      if (settings.mode === "quote" && n >= words.length) { const e = startTime ? (Date.now() - startTime) / 1000 : 0; setTimeout(() => finish(e), 0); }
      if (settings.mode === "custom" && n >= words.length) { const e = startTime ? (Date.now() - startTime) / 1000 : 0; setTimeout(() => finish(e), 0); }
      if (n > words.length - 20 && settings.mode !== "custom" && settings.mode !== "quote") setWords((w) => [...w, ...generateWords(40, { punctuation: settings.punctuation, numbers: settings.numbers, code: settings.language === "code" })]);
      return;
    }
    setInput(val);
    const cur = words[wordIdx] ?? "";
    if (val.length > cur.length + 8) setInput(val.slice(0, cur.length + 8));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (finished) return;
    if (e.key === "Backspace") {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl) {
        e.preventDefault();
        if (input.length > 0) setInput("");
        else if (wordIdx > 0) {
          const p = wordIdx - 1; const st = wordStats[p];
          if (st) { setCorrectChars((x) => x - st.c - 1); setIncorrectChars((x) => x - st.ic); setExtraCount((x) => x - st.ex); setMissedCount((x) => x - st.miss); }
          setHistory((h) => h.slice(0, -1)); setExtraChars((ec) => ec.slice(0, p)); setWordStats((ws) => ws.slice(0, -1)); setWordIdx(p); setInput("");
        }
        return;
      } else if (input.length === 0 && wordIdx > 0) {
        e.preventDefault();
        const p = wordIdx - 1; const prev = history[p] ?? ""; const st = wordStats[p];
        if (st) { setCorrectChars((x) => x - st.c - 1); setIncorrectChars((x) => x - st.ic); setExtraCount((x) => x - st.ex); setMissedCount((x) => x - st.miss); }
        setHistory((h) => h.slice(0, -1)); setExtraChars((ec) => ec.slice(0, p)); setWordStats((ws) => ws.slice(0, -1)); setWordIdx(p); setInput(prev);
        return;
      }
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Tab" && !e.shiftKey) e.preventDefault();
      if (e.key === "Escape") inputRef.current?.blur();
      if (typeof (e as KeyboardEvent & { getModifierState?: (k: string) => boolean }).getModifierState === "function") {
        setCapsOn((e as KeyboardEvent & { getModifierState: (k: string) => boolean }).getModifierState("CapsLock"));
      }
    };
    const up = (e: KeyboardEvent) => {
      if (typeof (e as KeyboardEvent & { getModifierState?: (k: string) => boolean }).getModifierState === "function") {
        setCapsOn((e as KeyboardEvent & { getModifierState: (k: string) => boolean }).getModifierState("CapsLock"));
      }
    };
    window.addEventListener("keydown", h);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", h); window.removeEventListener("keyup", up); };
  }, []);
  useEffect(() => {
    let tab = false;
    const d = (e: KeyboardEvent) => { if (e.key === "Tab") tab = true; if (e.key === "Enter" && tab) { e.preventDefault(); reset(); } };
    const u = (e: KeyboardEvent) => { if (e.key === "Tab") tab = false; };
    window.addEventListener("keydown", d); window.addEventListener("keyup", u);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); };
  }, [reset]);

  // Keep active word visible
  useEffect(() => {
    if (!wordsRef.current) return;
    const a = wordsRef.current.querySelector(`[data-word="${wordIdx}"]`) as HTMLElement | null;
    if (a) {
      const pr = wordsRef.current.getBoundingClientRect(), er = a.getBoundingClientRect();
      if (er.top < pr.top || er.bottom > pr.bottom) a.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [wordIdx]);

  // Single caret positioning — premium, always visible, correct block/underline
  const updateCaret = useCallback(() => {
    const caret = caretRef.current;
    const container = wordsRef.current;
    if (!caret || !container) return;
    if (finished) { caret.style.opacity = "0"; caret.classList.add("hidden"); return; }
    caret.classList.remove("hidden", "dim");
    if (!isFocused && !startTime) caret.classList.add("dim");
    else caret.classList.remove("dim");
    const wordLen = words[wordIdx]?.length ?? 0;
    const extra = isFocused || startTime ? input.slice(wordLen) : "";
    const hasExtra = extra.length > 0;
    const atEnd = input.length >= wordLen;

    // Find anchor element
    let anchor: HTMLElement | null = null;
    let isAfter = false;

    if (!atEnd) {
      anchor = container.querySelector(`[data-char="${wordIdx}-${input.length}"]`) as HTMLElement | null;
      isAfter = false;
    } else if (hasExtra) {
      // last extra char
      anchor = container.querySelector(`[data-extra="${wordIdx}-${extra.length - 1}"]`) as HTMLElement | null;
      isAfter = true;
    } else {
      anchor = container.querySelector(`[data-char="${wordIdx}-${wordLen - 1}"]`) as HTMLElement | null;
      isAfter = true;
      if (wordLen === 0) {
        const w = container.querySelector(`[data-word="${wordIdx}"]`) as HTMLElement | null;
        if (w) anchor = w;
      }
    }

    if (!anchor) {
      caret.style.opacity = "0";
      return;
    }

    const cRect = container.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    const isLine = settings.caretStyle === "line";
    const isBlock = settings.caretStyle === "block";
    const isUnder = settings.caretStyle === "underline";

    // For block: should cover the anchor char itself if not after, else next position width
    // For line/underline: at left edge (or right edge if isAfter)
    let left = isAfter ? r.right - cRect.left : r.left - cRect.left;
    // nudge for line so it sits between chars
    if (isLine && !isAfter) left -= 0; // at left of current char
    // top and height
    let top = r.top - cRect.top;
    let h = r.height;
    let w = 2;

    if (isBlock) {
      if (!isAfter) {
        // block over a real char is handled by .char-block-active (inverted), hide floating caret
        caret.style.opacity = "0";
        caret.style.width = "0";
        caret.style.height = "0";
        return;
      }
      w = r.width || 10;
      h = r.height;
      top = r.top - cRect.top;
      caret.style.borderRadius = "3px";
      caret.style.boxShadow = "none";
      caret.style.background = "var(--caret)";
      if (!caret.classList.contains("dim")) caret.style.opacity = "1";
    } else if (isUnder) {
      if (!isAfter) {
        // underline over a real char is handled by .char-underline-active, hide floating caret
        caret.style.opacity = "0";
        caret.style.width = "0";
        caret.style.height = "0";
        return;
      }
      w = r.width || 10;
      h = 2.5;
      top = r.bottom - cRect.top - 1.5;
      caret.style.borderRadius = "999px";
      caret.style.boxShadow = "none";
      caret.style.background = "var(--caret)";
      if (!caret.classList.contains("dim")) caret.style.opacity = "1";
    } else {
      // line — premium 2.5px, centered
      w = 2.5;
      h = r.height * 0.92;
      top = r.top - cRect.top + r.height * 0.04;
      caret.style.borderRadius = "999px";
      caret.style.background = "var(--caret)";
      caret.style.boxShadow = "0 0 8px color-mix(in srgb, var(--caret) 35%, transparent)";
      if (!caret.classList.contains("dim")) caret.style.opacity = "1";
      left = isAfter ? r.right - cRect.left - 0.75 : r.left - cRect.left - 0.75;
    }

    caret.style.left = `${left}px`;
    caret.style.top = `${top}px`;
    caret.style.width = `${w}px`;
    caret.style.height = `${h}px`;
  }, [wordIdx, input, words, settings.caretStyle, isFocused, startTime, finished, extraChars]);

  useLayoutEffect(() => { updateCaret(); }, [updateCaret]);
  useEffect(() => {
    const onResize = () => updateCaret();
    window.addEventListener("resize", onResize);
    const id = requestAnimationFrame(() => updateCaret());
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(id); };
  }, [updateCaret]);

  const bestWpm = useHistoryStore((s) => s.bestWpm());
  const bestReplayRun = useHistoryStore((s) => s.results.find((r) => r.replay && r.replay.length > 4));
  const ghostTarget = settings.ghost ? (settings.ghostWpm || bestWpm || 0) : 0;
  const updateGhost = useCallback(() => {
    const ghost = ghostRef.current;
    const container = wordsRef.current;
    if (!ghost || !container || !settings.ghost || !startTime || finished) { if (ghost) ghost.style.opacity = "0"; return; }

    let gWordIdx = 0, gCharIdx = 0;
    const useReplay = bestReplayRun?.replay && bestReplayRun.replay.length > 4;
    if (useReplay) {
      // TRUE ghost — replay the best run keystroke-for-keystroke
      const evts = bestReplayRun!.replay!;
      const elapsedMs = Date.now() - startTime;
      let lo = 0, hi = evts.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (evts[mid] <= elapsedMs) lo = mid + 1; else hi = mid; }
      const charsDone = lo; // committed keystrokes at this moment
      let acc2 = 0;
      outer: for (let i = 0; i < words.length; i++) {
        for (let cIdx = 0; cIdx <= words[i].length; cIdx++) {
          if (acc2 >= charsDone) { gWordIdx = i; gCharIdx = cIdx; break outer; }
          acc2++;
        }
      }
    } else {
      if (ghostTarget === 0) { ghost.style.opacity = "0"; return; }
      const elapsed = (Date.now() - (startTime ?? Date.now())) / 1000;
      const ghostChars = (ghostTarget * 5 * elapsed) / 60;
      let acc = 0;
      for (let i = 0; i < words.length; i++) {
        const wlen = words[i].length + 1;
        if (acc + wlen > ghostChars) { gWordIdx = i; gCharIdx = Math.max(0, Math.floor(ghostChars - acc)); break; }
        acc += wlen;
        if (i === words.length - 1) { gWordIdx = i; gCharIdx = words[i].length; }
      }
    }
    const wordLen = words[gWordIdx]?.length ?? 0;
    const atEnd = gCharIdx >= wordLen;
    let anchor: HTMLElement | null = null;
    let isAfter = false;
    if (!atEnd) anchor = container.querySelector(`[data-char="${gWordIdx}-${gCharIdx}"]`) as HTMLElement | null;
    else { anchor = container.querySelector(`[data-char="${gWordIdx}-${wordLen - 1}"]`) as HTMLElement | null; isAfter = true; if (wordLen === 0) anchor = container.querySelector(`[data-word="${gWordIdx}"]`) as HTMLElement | null; }
    if (!anchor) { ghost.style.opacity = "0"; return; }
    const cRect = container.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    const left = isAfter ? r.right - cRect.left - 0.5 : r.left - cRect.left - 0.5;
    const top = r.top - cRect.top + r.height * 0.04;
    ghost.style.left = `${left}px`;
    ghost.style.top = `${top}px`;
    ghost.style.width = "2px";
    ghost.style.height = `${r.height * 0.92}px`;
    ghost.style.opacity = "0.45";
    ghost.style.background = useReplay ? "var(--accent-light)" : "var(--text-faint)";
    ghost.style.borderRadius = "999px";
  }, [words, settings.ghost, ghostTarget, startTime, finished, bestReplayRun]);

  useLayoutEffect(() => { updateGhost(); }, [updateGhost, elapsed, wordIdx, input]);
  useEffect(() => {
    if (!settings.ghost || !startTime || finished || ghostTarget === 0) return;
    const id = setInterval(updateGhost, 70);
    return () => clearInterval(id);
  }, [updateGhost, settings.ghost, startTime, finished, ghostTarget]);

  const liveElapsed = startTime ? (finished ? elapsed : (Date.now() - startTime) / 1000) : 0;
  const timeLeft = Math.max(0, Math.ceil(timeLimit - liveElapsed));
  const progress = settings.mode === "time" ? Math.min(100, (liveElapsed / timeLimit) * 100) : settings.mode === "words" ? (wordIdx / wordsLimit) * 100 : (wordIdx / Math.max(1, words.length)) * 100;
  const liveAcc = correctChars + incorrectChars + extraCount > 0 ? Math.round((correctChars / (correctChars + incorrectChars + extraCount)) * 100) : 100;
  const liveAccRef = useRef(liveAcc);
  liveAccRef.current = liveAcc;

  return (
    <div data-tour="typing-area" className="w-full max-w-[740px] mx-auto px-4">
      {settings.handGuide && !finished && (
        <HandGuide nextChar={words[wordIdx]?.[input.length] ?? " "} />
      )}
      {settings.breathing && (
        <div className="mb-4">
          <div className="text-[10px] tracking-widest uppercase text-center mb-1" style={{ color: "var(--text-dim)" }}>Breathe — inhale 4s • hold • exhale 4s</div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
            <div className="breathing-bar h-full rounded-full" style={{ background: "var(--primary)" }} />
          </div>
        </div>
      )}
      {settings.mode === "custom" && !startTime && (
        <div className="panel p-4 mb-4 space-y-3">
          <div className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Your-Code Typing — paste code or GitHub URL</div>
          <div className="flex gap-2">
            <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/user/repo/blob/main/file.ts" className="flex-1 h-8 rounded-md border px-3 text-[12px] font-mono" style={{ background: "var(--bg-subtle)", borderColor: githubError ? "var(--danger)" : "var(--border)", color: "var(--text-strong)" }} />
            <button onClick={fetchGithub} disabled={fetchingCode || !githubUrl.trim()} className="h-8 px-3 rounded-md text-[12px] font-medium border disabled:opacity-50" style={{ background: "var(--primary)", color: "white", borderColor: "var(--primary)" }}>{fetchingCode ? "..." : "Fetch"}</button>
          </div>
          {githubError && <div className="text-[11px] px-2 py-1 rounded-md border" style={{ background: "color-mix(in srgb, var(--danger) 8%, transparent)", borderColor: "var(--danger)", color: "var(--danger)" }}>{githubError}</div>}
          <textarea
            value={settings.customText}
            onChange={(e) => settings.setCustomText(e.target.value)}
            placeholder="Paste your text or code here — syntax-aware when language is 'code'..."
            className="w-full min-h-[88px] rounded-md border p-3 text-[13px] leading-relaxed resize-y"
            style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)", fontFamily: "var(--font-mono)" }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono" style={{ color: "var(--text-dim)" }}>{settings.customText.trim().split(/\s+/).filter(Boolean).length} words • {settings.customText.length} chars • {settings.language === "code" ? "code highlighted" : "plain"}</span>
            <button onClick={reset} className="h-7 px-3 rounded-md text-[12px] font-medium" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>Use text</button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between py-3 border-b mb-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-5 text-[12px] font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: startTime ? "var(--primary)" : "var(--border-strong)" }} />
            <span style={{ color: startTime ? "var(--text-strong)" : "var(--text-dim)" }}>{settings.mode === "time" ? `${timeLeft}s` : `${wordIdx} / ${settings.mode === "words" ? wordsLimit : words.length}`}</span>
          </span>
          <span className="hidden sm:inline" style={{ color: "var(--border-strong)" }}>·</span>
          <span className="hidden sm:inline-flex items-center gap-1.5" style={{ color: "var(--text-dim)" }}>
            <span style={{ color: "var(--text-strong)" }}>{wpm}</span> WPM<span style={{ color: "var(--border-strong)" }}>/</span><span>{raw}</span> raw<span style={{ color: "var(--border-strong)" }}>/</span><span>{liveAcc}%</span>
          </span>
          {settings.blindMode && <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded border" style={{ background: "var(--primary-soft)", borderColor: "var(--primary-border)", color: "var(--primary)" }}>Blind</span>}
          {settings.stopOnWord && <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Strict</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`hidden md:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md border ${capsOn ? "animate-pulse" : ""}`} style={{ background: capsOn ? "color-mix(in srgb, var(--danger) 12%, var(--bg-card))" : "var(--bg-card)", borderColor: capsOn ? "color-mix(in srgb, var(--danger) 30%, var(--border))" : "var(--border)", color: capsOn ? "var(--danger)" : "var(--text-dim)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: capsOn ? "var(--danger)" : "var(--border-strong)" }} /> {capsOn ? "⇪ Caps ON" : "Caps • Off"}
          </span>
          <span className="hidden md:inline text-[11px] font-mono" style={{ color: "var(--text-dim)" }}>{Math.round(liveElapsed)}s elapsed</span>
          {settings.rhythm && startTime && !finished && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded-md border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>
              <span key={Math.floor(Date.now() / 667)} className="beat-dot w-2 h-2 rounded-full inline-block" style={{ background: "var(--primary)" }} /> 90 BPM
            </span>
          )}
          <button onClick={reset} className="h-7 px-2.5 rounded-md text-[12px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Restart</button>
        </div>
      </div>

      <div className="h-px w-full mb-3" style={{ background: "var(--border)" }}>
        <div className="h-px transition-all duration-150" style={{ width: `${progress}%`, background: "var(--primary)" }} />
      </div>
      <div className="flex items-center justify-between mb-4 text-[11px] font-mono" style={{ color: "var(--text-dim)" }}>
        <span>
          <span style={{ color: correctChars ? "var(--text-strong)" : "var(--text-dim)" }}>{correctChars} correct</span> · <span style={{ color: incorrectChars ? "var(--danger)" : "var(--text-dim)" }}>{incorrectChars} incorrect</span> · <span style={{ color: extraCount ? "var(--danger)" : "var(--text-dim)" }}>{extraCount} extra</span> · <span style={{ color: missedCount ? "var(--danger)" : "var(--text-dim)" }}>{missedCount} missed</span>
        </span>
        <span className="hidden sm:inline">burst {wpmHistory.length ? Math.max(...wpmHistory, wpm) : wpm} · {liveAcc}% acc</span>
      </div>

      <div onClick={() => inputRef.current?.focus()} className="relative cursor-text select-none">
        {capsOn && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold shadow-sm" style={{ background: "var(--danger)", color: "white", borderColor: "var(--danger)" }}>
            ⇪ Caps Lock is on — turn off to avoid errors
          </div>
        )}
        {!isFocused && !startTime && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="px-4 py-2 rounded-md flex items-center gap-2.5 border shadow-sm" style={{ background: "var(--bg-surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
              <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--text-dim)" }}>Paused</span>
              <span className="text-[13px] font-medium" style={{ color: "var(--text-strong)" }}>Click or start typing</span>
              <span className="kbd hidden sm:inline">Space</span>
            </div>
          </div>
        )}

        <div ref={wordsRef} className="relative flex flex-wrap gap-x-[0.52em] gap-y-1.5 content-start overflow-hidden py-2" style={{ fontFamily: "var(--font-mono)", fontSize: `${settings.fontSize}px`, lineHeight: "1.75", fontWeight: 400, letterSpacing: "-0.015em", maxHeight: settings.mode === "zen" ? "380px" : "220px" }}>
          {/* single caret */}
          <div
            ref={caretRef}
            className={`caret ${startTime ? "typing" : ""} ${settings.caretStyle === "block" ? "block" : settings.caretStyle === "underline" ? "underline" : ""} ${!isFocused && !startTime ? "hidden" : ""}`}
            aria-hidden
          />
          <div
            ref={ghostRef}
            className="absolute pointer-events-none"
            style={{ background: "var(--text-faint)", opacity: 0, borderRadius: "999px", width: "2px", zIndex: 1, transition: "left 70ms linear, top 70ms linear, opacity 120ms ease" }}
            aria-hidden
          />

          {words.map((word, wIdx) => {
            const isCurrent = wIdx === wordIdx;
            const isPast = wIdx < wordIdx;
            const pastTyped = history[wIdx] ?? "";
            const wordExtra = isPast ? (extraChars[wIdx] ?? "") : isCurrent ? input.slice(word.length) : "";
            const isPastIncorrect = isPast && pastTyped !== word;
            return (
              <span
                key={wIdx}
                data-word={wIdx}
                className="relative inline-flex"
                style={{
                  padding: "1px 2px",
                  margin: "-1px -2px",
                  borderRadius: 4,
                  background: isPastIncorrect ? "rgba(229,72,77,0.08)" : isCurrent ? "var(--bg-subtle)" : "transparent",
                  borderBottom: isCurrent ? "1px solid var(--border-strong)" : "1px solid transparent",
                  ...(getTokenStyle(word) || {}),
                  opacity: isPast && !isPastIncorrect ? 0.9 : 1,
                }}
              >
                {word.split("").map((ch, cIdx) => {
                  let cls = "char-pending";
                  if (isPast) cls = pastTyped[cIdx] === ch ? "char-correct" : "char-incorrect";
                  else if (isCurrent) {
                    const t = input[cIdx];
                    if (t !== undefined) cls = t === ch ? (settings.blindMode ? "char-pending" : "char-correct") : "char-incorrect";
                  }
                  if (settings.blindMode && isCurrent && cIdx < input.length) cls = "char-pending";
                  const isCaretChar = isCurrent && cIdx === input.length;
                  const isBlockCaret = isCaretChar && settings.caretStyle === "block";
                  const isUnderlineCaret = isCaretChar && settings.caretStyle === "underline";
                  if (isBlockCaret) {
                    cls += " char-block-active";
                    if (!startTime) cls += " blink";
                  } else if (isUnderlineCaret) {
                    cls += " char-underline-active";
                    if (!startTime) cls += " blink";
                  }
                  return (
                    <span key={cIdx} data-char={`${wIdx}-${cIdx}`} className={`${cls} relative inline-block`} style={{ zIndex: isBlockCaret || isUnderlineCaret ? 1 : undefined }}>
                      {ch}
                    </span>
                  );
                })}
                {wordExtra.split("").map((ch, i) => (
                  <span key={`ex-${i}`} data-extra={`${wIdx}-${i}`} className="char-extra inline-block">
                    {ch}
                  </span>
                ))}
              </span>
            );
          })}
        </div>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false}
          className="absolute inset-0 opacity-0 pointer-events-none"
          aria-label="typing input"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-4 border-t text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
        <div className="flex items-center gap-2 font-mono">
          <span className="kbd">Tab</span> <span>+</span> <span className="kbd">Enter</span> <span>restart</span>
          <span className="hidden sm:inline" style={{ color: "var(--border-strong)" }}>·</span>
          <span className="hidden sm:inline-flex items-center gap-1"><span className="kbd">Ctrl</span> + <span className="kbd">⌫</span> delete word</span>
        </div>
        <button onClick={() => document.getElementById("footer-settings")?.scrollIntoView({ behavior: "smooth" })} className="text-[11px] font-medium hover:underline" style={{ color: "var(--text-dim)" }}>
          Preferences <span style={{ color: "var(--text-faint)" }}>→</span>
        </button>
      </div>
    </div>
  );
}
