// Animated Hand Guide — SVG hands highlighting which finger presses next
const FINGER_POS: Record<string, { hand: "L" | "R"; finger: number }> = {
  "L-pinky": { hand: "L", finger: 0 }, "L-ring": { hand: "L", finger: 1 }, "L-middle": { hand: "L", finger: 2 }, "L-index": { hand: "L", finger: 3 },
  "R-index": { hand: "R", finger: 3 }, "R-middle": { hand: "R", finger: 2 }, "R-ring": { hand: "R", finger: 1 }, "R-pinky": { hand: "R", finger: 0 },
};

export function fingerOf(key: string): string {
  if ("qaz`1\t".includes(key)) return "L-pinky";
  if ("wsx2".includes(key)) return "L-ring";
  if ("edc3".includes(key)) return "L-middle";
  if ("rfvtgb45".includes(key)) return "L-index";
  if (" ".includes(key)) return "thumb";
  if ("yhnujm67".includes(key)) return "R-index";
  if ("ik,8".includes(key)) return "R-middle";
  if ("ol.9".includes(key)) return "R-ring";
  return "R-pinky"; // p ; / [ ] ' - = 0
}

export function HandGuide({ nextChar }: { nextChar: string }) {
  const finger = fingerOf(nextChar.toLowerCase());
  const active = FINGER_POS[finger];
  const isThumb = finger === "thumb";

  const fingertip = (hand: "L" | "R", fi: number, cx: number) => {
    const on = active?.hand === hand && active.finger === fi;
    return <circle key={`${hand}${fi}`} cx={cx} cy={fi === 3 ? 58 : 30 + fi * 4} r={on ? 7 : 5} fill={on ? "var(--primary)" : "var(--bg-muted)"} stroke={on ? "var(--primary)" : "var(--border-strong)"} strokeWidth={on ? 2 : 1} style={on ? { filter: "drop-shadow(0 0 6px var(--primary))" } : undefined} />;
  };

  return (
    <div className="flex items-center justify-center gap-6 mb-3 select-none" title={`Next key: ${nextChar || "space"} → ${finger}`}>
      {/* Left hand */}
      <svg width="86" height="72" viewBox="0 0 86 72">
        <path d="M8 70 L8 34 Q8 24 16 26 L20 12 Q22 4 28 8 Q32 10 30 18 L28 28 L36 8 Q40 0 46 4 Q50 7 47 15 L41 30 L52 12 Q56 5 62 9 Q66 13 61 21 L50 38 L64 26 Q69 22 73 27 Q76 31 71 37 L48 68 Z" fill="var(--bg-card)" stroke="var(--border-strong)" strokeWidth="1.5" />
        {[fingertip("L", 0, 14), fingertip("L", 1, 33), fingertip("L", 2, 44), fingertip("L", 3, 60)]}
      </svg>

      <div className="text-center">
        <div className="w-14 h-14 rounded-xl border-2 flex items-center justify-center font-mono font-bold text-[20px]" style={{ borderColor: "var(--primary)", color: "var(--text-strong)", background: "var(--primary-soft)", boxShadow: "0 0 12px color-mix(in srgb, var(--primary) 30%, transparent)" }}>
          {nextChar ? (nextChar === " " ? "␣" : nextChar.toUpperCase()) : "·"}
        </div>
        <div className="text-[10px] mt-1 tracking-wide uppercase" style={{ color: "var(--text-dim)" }}>{isThumb ? "thumbs" : finger}</div>
      </div>

      {/* Right hand */}
      <svg width="86" height="72" viewBox="0 0 86 72">
        <path d="M78 70 L78 34 Q78 24 70 26 L66 12 Q64 4 58 8 Q54 10 56 18 L58 28 L50 8 Q46 0 40 4 Q36 7 39 15 L45 30 L34 12 Q30 5 24 9 Q20 13 25 21 L36 38 L22 26 Q17 22 13 27 Q10 31 15 37 L38 68 Z" fill="var(--bg-card)" stroke="var(--border-strong)" strokeWidth="1.5" />
        {[fingertip("R", 3, 26), fingertip("R", 2, 42), fingertip("R", 1, 53), fingertip("R", 0, 72)]}
      </svg>
    </div>
  );
}
