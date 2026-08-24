type Props = {
  charErrorMap: Record<string, number>;
  totalErrors?: number;
};

const ROWS: string[][] = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "backspace"],
  ["tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["capslock", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "enter"],
  ["shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "shift2"],
  ["ctrl", "win", "alt", "space", "alt2", "win2", "menu", "ctrl2"],
];

const KEY_WIDTH: Record<string, number> = {
  backspace: 1.6, tab: 1.4, capslock: 1.7, enter: 1.9, shift: 2.0, shift2: 2.0, ctrl: 1.3, win: 1.1, alt: 1.3, space: 6.5, alt2: 1.3, win2: 1.1, menu: 1.1, ctrl2: 1.3,
};

function fingerOf(k: string): string {
  if ("qaz`1".includes(k)) return "L-pinky";
  if ("wsx2".includes(k)) return "L-ring";
  if ("edc3".includes(k)) return "L-middle";
  if ("rfvtgb45".includes(k)) return "L-index";
  if ("yhnujm67".includes(k)) return "R-index";
  if ("ik,8".includes(k)) return "R-middle";
  if ("ol.9".includes(k)) return "R-ring";
  if ("p;/-=[]\\0'".includes(k)) return "R-pinky";
  return "thumb";
}

export function KeyboardDiagram({ charErrorMap, totalErrors }: Props) {
  const max = Math.max(1, ...Object.values(charErrorMap));
  const getIntensity = (k: string) => {
    const v = charErrorMap[k.toLowerCase()] || 0;
    return v / max;
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[560px] space-y-1.5 p-2 rounded-lg" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}>
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-1 justify-center">
            {row.map((k) => {
              const label = k === "backspace" ? "⌫" : k === "capslock" ? "⇪" : k === "enter" ? "↵" : k === "shift" || k === "shift2" ? "⇧" : k === "space" ? "space" : k === "tab" ? "↹" : k === "ctrl" || k === "ctrl2" ? "ctrl" : k === "win" || k === "win2" ? "win" : k === "alt" || k === "alt2" ? "alt" : k === "menu" ? "☰" : k;
              const w = KEY_WIDTH[k] || 1;
              const isChar = k.length === 1 && /[a-z0-9`\-=\[\]\\;',\.\/]/.test(k);
              const intensity = isChar ? getIntensity(k) : 0;
              const cnt = isChar ? charErrorMap[k] || 0 : 0;
              // color scale: from bg-muted to danger
              const bg = cnt
                ? `color-mix(in srgb, var(--danger) ${Math.round(intensity * 55 + 10)}%, var(--bg-card))`
                : "var(--bg-card)";
              const border = cnt
                ? `color-mix(in srgb, var(--danger) ${Math.round(intensity * 60 + 12)}%, var(--border))`
                : "var(--border)";
              const textColor = cnt > max * 0.35 ? "var(--text-strong)" : cnt ? "var(--text-strong)" : "var(--text-dim)";
              return (
                <div
                  key={k + ri}
                  className="h-8 rounded-md border flex items-center justify-center text-[10px] font-mono font-medium select-none relative"
                  style={{
                    flex: w,
                    maxWidth: w > 2 ? 96 : 36,
                    minWidth: w > 2 ? 48 : 28,
                    background: bg,
                    borderColor: border,
                    color: textColor,
                    boxShadow: cnt ? `0 0 0 1px color-mix(in srgb, var(--danger) 14%, transparent)` : "none",
                  }}
                  title={isChar ? `${k.toUpperCase()} • ${fingerOf(k)} • ${cnt} errors${totalErrors ? ` • ${(cnt / totalErrors * 100).toFixed(1)}%` : ""}` : label}
                >
                  <span className="tracking-tight">{label}</span>
                  {cnt > 0 && isChar && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center border" style={{ background: "var(--danger)", color: "white", borderColor: "var(--bg-subtle)", fontSize: 7 }}>
                      {cnt}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div className="flex items-center justify-center gap-4 pt-2 text-[10px]" style={{ color: "var(--text-faint)" }}>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }} /> 0</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "color-mix(in srgb, var(--danger) 30%, var(--bg-card))", borderColor: "color-mix(in srgb, var(--danger) 30%, var(--border))" }} /> few</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--danger)", borderColor: "var(--danger)" }} /> many</span>
          <span className="hidden sm:inline">• hover for finger & count</span>
        </div>
      </div>
    </div>
  );
}
