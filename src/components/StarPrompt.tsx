import { useEffect, useState } from "react";
import { useHistoryStore } from "../store/useHistoryStore";

const STAR_KEY = "typecraft_star_prompt_done";

/** Shows a small "Star on GitHub" prompt after the user completes 3 tests. Dismissed permanently. */
export function StarPrompt() {
  const history = useHistoryStore((s) => s.results);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alreadyDone = false;
    try { alreadyDone = !!localStorage.getItem(STAR_KEY); } catch {}
    if (alreadyDone) { setDismissed(true); return; }
    // show once history reaches 3 runs (and not already dismissed this session)
    if (history.length >= 3 && !dismissed) {
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    }
  }, [history.length, dismissed]);

  const dismiss = () => {
    try { localStorage.setItem(STAR_KEY, "1"); } catch {}
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 z-40 max-w-[320px] rounded-lg border overflow-hidden animate-[fadeIn_0.3s_ease]"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", boxShadow: "var(--shadow-lg)" }}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="var(--text-strong)" className="shrink-0 mt-0.5">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/>
          </svg>
          <div>
            <div className="text-[12px] font-semibold" style={{ color: "var(--text-strong)" }}>
              Enjoying typecheck?
            </div>
            <div className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--text-dim)" }}>
              It's free and open source. A star helps others find it.
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <a
            href="https://github.com/SarthakKrishak/Typecraft"
            target="_blank"
            rel="noreferrer"
            onClick={dismiss}
            className="flex-1 h-7 rounded-md text-[11px] font-semibold flex items-center justify-center gap-1.5"
            style={{ background: "var(--text-strong)", color: "var(--bg)" }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/></svg>
            Star on GitHub
          </a>
          <button
            onClick={dismiss}
            className="h-7 px-3 rounded-md text-[11px] font-medium border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
