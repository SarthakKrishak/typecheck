export type TestMode = "time" | "words" | "quote" | "zen" | "custom";
export type Language = "english" | "code";

export type Result = {
  id: string;
  wpm: number; // net WPM: (correctChars/5)/min — the gold standard (Monkeytype)
  rawWpm: number; // gross WPM: (all typed/5)/min
  accuracy: number; // 0-100, two decimals
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  correctWords: number;
  incorrectWords: number;
  time: number; // seconds, one decimal
  mode: TestMode;
  language: Language;
  punctuation: boolean;
  numbers: boolean;
  consistency: number; // 0-100, CV-based
  burst: number; // peak WPM in history
  wpmHistory: number[]; // per-second net WPM
  rawHistory: number[]; // per-second gross WPM
  timestamp: number;
  textLength: number;
  weakKeys?: string[];
  weakBigrams?: string[];
  charErrorMap?: Record<string, number>;
  bigramErrorMap?: Record<string, number>;
  replay?: number[]; // ms offsets of each committed keystroke — powers Replay Theater & true ghost
};

// Net WPM — correct chars only, per Monkeytype: (correct/5) / minutes
// Correct includes spaces (we add +1 per committed word), so 1 word = 5 chars
export function calcWpm(correctChars: number, elapsedSec: number): number {
  if (elapsedSec <= 0 || correctChars <= 0) return 0;
  const mins = elapsedSec / 60;
  const wpm = (correctChars / 5) / mins;
  return Math.round(wpm);
}

// Gross / Raw WPM — all typed chars /5 / minutes
export function calcRaw(totalTyped: number, elapsedSec: number): number {
  if (elapsedSec <= 0 || totalTyped <= 0) return 0;
  const mins = elapsedSec / 60;
  const raw = (totalTyped / 5) / mins;
  return Math.round(raw);
}

// Accuracy — correct / totalAttempted *100, two decimals, total = correct+incorrect+extra+missed
// Missed = chars in target not typed (skipped), Extra = chars typed beyond target
export function calcAccuracy(correct: number, incorrect: number, extra: number, missed: number): number {
  const total = correct + incorrect + extra + missed;
  if (total === 0) return 100;
  const acc = (correct / total) * 100;
  return Math.round(acc * 100) / 100;
}

// Consistency — 1 - coefficient of variation (std/mean), as in Monkeytype
// Sample 1s WPM history, ignore zeros at start
export function calcConsistency(wpmHistory: number[]): number {
  const filtered = wpmHistory.filter((v) => v > 0);
  if (filtered.length < 2) return 100;
  const mean = filtered.reduce((a, b) => a + b, 0) / filtered.length;
  if (mean === 0) return 0;
  const variance = filtered.reduce((a, b) => a + (b - mean) ** 2, 0) / filtered.length;
  const std = Math.sqrt(variance);
  const cv = std / mean;
  // clamp cv 0..1, consistency 0..100
  const consistency = (1 - Math.min(1, cv)) * 100;
  return Math.round(consistency * 100) / 100;
}

// Burst — peak WPM in history
export function calcBurst(wpmHistory: number[]): number {
  if (wpmHistory.length === 0) return 0;
  return Math.max(...wpmHistory);
}

// Net vs Gross gap — useful for analytics
export function calcErrorRate(incorrect: number, extra: number, missed: number, correct: number): number {
  const total = correct + incorrect + extra + missed;
  if (total === 0) return 0;
  return Math.round(((incorrect + extra + missed) / total) * 10000) / 100;
}
