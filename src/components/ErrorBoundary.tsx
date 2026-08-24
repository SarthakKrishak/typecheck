import React from "react";

type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // local only — no reporting, just console for dev
    console.error("Typecheck ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg)", color: "var(--text)" }}>
          <div className="panel p-6 max-w-[480px] w-full text-center">
            <div className="text-[14px] font-semibold" style={{ color: "var(--text-strong)" }}>Something went wrong — but your data is safe (local).</div>
            <div className="text-[12px] mt-2" style={{ color: "var(--text-dim)" }}>{this.state.error?.message || "Unknown error"}</div>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => { localStorage.clear(); location.reload(); }} className="h-8 px-4 rounded-md text-[12px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-strong)" }}>Clear local data & reload</button>
              <button onClick={() => this.setState({ hasError: false })} className="h-8 px-4 rounded-md text-[12px] font-medium" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>Try again</button>
            </div>
            <div className="text-[11px] mt-3" style={{ color: "var(--text-faint)" }}>No data left your browser. Report at github.com/SarthakKrishak/Typecheck/issues</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
