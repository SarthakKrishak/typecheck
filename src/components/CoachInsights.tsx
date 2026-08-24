import { useHistoryStore } from "../store/useHistoryStore";
import type { Result } from "../engine/stats";

// Rule-based "Coach Voice" — natural-language insights, fully offline
function buildInsights(history: Result[]): string[] {
  const out: string[] = [];
  if (history.length < 3) {
    out.push("Run a few more tests and I'll start spotting patterns in your typing.");
    return out;
  }
  const recent = history.slice(0, 5);
  const older = history.slice(5, 15);
  const recentAvg = recent.reduce((a, b) => a + b.wpm, 0) / recent.length;
  const olderAvg = older.length ? older.reduce((a, b) => a + b.wpm, 0) / older.length : null;
  const acc = Math.round(recent.reduce((a, b) => a + b.accuracy, 0) / recent.length);
  const cons = Math.round(recent.reduce((a, b) => a + b.consistency, 0) / recent.length);

  if (olderAvg !== null) {
    const d = Math.round(recentAvg - olderAvg);
    if (d >= 2) out.push(`You're ${d} WPM faster than your earlier sessions — whatever you're doing, keep it up.`);
    else if (d <= -2) out.push(`You're ${Math.abs(d)} WPM slower than before. Shorter tests (15s) often rebuild rhythm fast.`);
  }

  if (acc < 94) out.push(`Accuracy is ${acc}% — every 1% of errors costs roughly 4-6 WPM. Try Strict mode for a few runs.`);
  else if (acc >= 98 && cons < 80) out.push(`${acc}% accuracy is excellent, but consistency is ${cons}% — you're sprinting then stalling. Aim for even seconds.`);

  // weakest finger from error maps
  const fingerMap: Record<string, number> = {};
  history.slice(0, 20).forEach((r) => Object.entries(r.charErrorMap || {}).forEach(([k, v]) => {
    const f = k.length === 1 ? fingerForKey(k) : "thumb";
    fingerMap[f] = (fingerMap[f] || 0) + v;
  }));
  const worst = Object.entries(fingerMap).sort((a, b) => b[1] - a[1])[0];
  if (worst && worst[1] > 2) out.push(`Your ${worst[0]} causes the most slips (${worst[1]} recently). Hit “Smart sentences” on the coach below the test — I build drills around it.`);

  // burst vs avg
  const last = history[0];
  if (last.burst > last.wpm * 1.6) out.push(`Peak speed was ${last.burst} WPM but you averaged ${last.wpm} — smoothing your start would lift your score more than raw speed.`);
  if (history.length >= 10 && cons >= 90 && acc >= 96) out.push("Rock-steady form. Time to raise difficulty — turn on punctuation or bump to 60s.");
  return out.slice(0, 4);
}

function fingerForKey(k: string): string {
  if ("qaz".includes(k)) return "left pinky";
  if ("wsx".includes(k)) return "left ring";
  if ("edc".includes(k)) return "left middle";
  if ("rfvtgb".includes(k)) return "left index";
  if ("yhnujm".includes(k)) return "right index";
  if ("ik,".includes(k)) return "right middle";
  if ("ol.".includes(k)) return "right ring";
  return "right pinky";
}

export function CoachInsights() {
  const history = useHistoryStore((s) => s.results);
  const insights = buildInsights(history);
  if (!insights.length) return null;
  return (
    <div className="panel p-4" style={{ background: "linear-gradient(135deg, var(--bg-highlight), var(--bg-card))", borderColor: "var(--primary-border)" }}>
      <div className="text-[11px] font-semibold tracking-widest uppercase mb-2 flex items-center gap-1.5" style={{ color: "var(--primary)" }}>
        ✦ Coach says
      </div>
      <ul className="space-y-2">
        {insights.map((t, i) => (
          <li key={i} className="text-[13px] leading-relaxed flex gap-2" style={{ color: "var(--text-strong)" }}>
            <span style={{ color: "var(--primary)" }}>›</span> {t}
          </li>
        ))}
      </ul>
      <div className="text-[10px] mt-3 pt-2 border-t" style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}>
        Rule-based, computed on-device from your last runs. Nothing leaves your browser.
      </div>
    </div>
  );
}
