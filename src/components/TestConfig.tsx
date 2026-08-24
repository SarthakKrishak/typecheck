import { useSettingsStore } from "../store/useSettingsStore";

function Seg({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="h-[26px] px-2 rounded-[4px] text-[12px] font-[450] tracking-tight" style={{ background: active ? "var(--bg-active)" : "transparent", color: active ? "var(--text-strong)" : "var(--text-dim)" }}>
      {children}
    </button>
  );
}

function SegGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center p-[2px] rounded-[5px] gap-[1px]" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>{children}</div>;
}

export function TestConfig() {
  const s = useSettingsStore();
  return (
    <div data-tour="test-config" className="w-full max-w-[720px] mx-auto px-4">
      <div className="panel px-2 py-1.5 flex flex-wrap items-center gap-1.5">
        <SegGroup>
          <Seg active={s.mode === "time"} onClick={() => s.setMode("time")}>Time</Seg>
          <Seg active={s.mode === "words"} onClick={() => s.setMode("words")}>Words</Seg>
          <Seg active={s.mode === "quote"} onClick={() => s.setMode("quote")}>Quote</Seg>
          <Seg active={s.mode === "zen"} onClick={() => s.setMode("zen")}>Zen</Seg>
          <Seg active={s.mode === "custom"} onClick={() => s.setMode("custom")}>Custom</Seg>
        </SegGroup>

        <span className="w-px h-4" style={{ background: "var(--border)" }} />

        {s.mode === "time" && (
          <SegGroup>
            {[15, 30, 60, 120].map((n) => <Seg key={n} active={s.time === n} onClick={() => s.setTime(n as never)}>{n}</Seg>)}
          </SegGroup>
        )}
        {s.mode === "words" && (
          <SegGroup>
            {[10, 25, 50, 100].map((n) => <Seg key={n} active={s.words === n} onClick={() => s.setWords(n as never)}>{n}</Seg>)}
          </SegGroup>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <SegGroup>
            <Seg active={s.language === "english"} onClick={() => s.setLanguage("english")}>EN</Seg>
            <Seg active={s.language === "code"} onClick={() => s.setLanguage("code")}>Code</Seg>
          </SegGroup>
          <SegGroup>
            <Seg active={s.punctuation} onClick={() => s.toggle("punctuation")}>Punct</Seg>
            <Seg active={s.numbers} onClick={() => s.toggle("numbers")}>Nums</Seg>
          </SegGroup>
        </div>
      </div>
    </div>
  );
}
