import { useMemo } from "react";
import { useBadgeStore, BADGE_DEFS, type BadgeDef } from "../store/useBadgeStore";
import { Tooltip } from "./Tooltip";

const TIER_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  bronze: { bg: "rgba(180,100,40,0.10)", border: "rgba(180,100,40,0.30)", text: "#c4884a", label: "Bronze" },
  silver: { bg: "rgba(160,160,170,0.10)", border: "rgba(160,160,170,0.30)", text: "#a0a0b0", label: "Silver" },
  gold: { bg: "rgba(230,190,80,0.10)", border: "rgba(230,190,80,0.30)", text: "#d4af37", label: "Gold" },
  diamond: { bg: "rgba(100,180,255,0.08)", border: "rgba(100,180,255,0.25)", text: "#64b5f6", label: "Diamond" },
};

function BadgeCard({ def, unlockedAt }: { def: BadgeDef; unlockedAt?: number }) {
  const unlocked = !!unlockedAt;
  const ts = TIER_STYLE[def.tier];
  return (
    <Tooltip content={unlocked ? `${def.name} — ${def.desc}` : `${def.name} — locked`}>
      <div
        className={`rounded-[6px] border p-3 flex items-center gap-3 transition-all ${unlocked ? "" : "opacity-35"}`}
        style={{
          background: unlocked ? ts.bg : "var(--bg-muted)",
          borderColor: unlocked ? ts.border : "var(--border)",
          minHeight: 64,
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-[6px] flex items-center justify-center text-[14px] font-mono font-bold shrink-0 border"
          style={{
            background: unlocked ? ts.bg : "var(--bg-active)",
            borderColor: unlocked ? ts.border : "var(--border)",
            color: unlocked ? ts.text : "var(--text-faint)",
          }}
        >
          {unlocked ? def.icon : "🔒"}
        </div>
        {/* Text */}
        <div className="min-w-0">
          <div className="text-[12px] font-semibold truncate" style={{ color: unlocked ? "var(--text-strong)" : "var(--text-faint)" }}>
            {def.name}
          </div>
          <div className="text-[11px] truncate" style={{ color: unlocked ? "var(--text-dim)" : "var(--text-faint)" }}>
            {def.desc}
          </div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: unlocked ? ts.text : "var(--text-faint)" }}>
            {ts.label}
            {unlocked && unlockedAt && <span className="ml-1.5 opacity-60">· {new Date(unlockedAt).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

export function BadgesPage() {
  const { unlocked } = useBadgeStore();
  const sorted = useMemo(() => {
    const tierOrder = { diamond: 0, gold: 1, silver: 2, bronze: 3 };
    return [...BADGE_DEFS].sort((a, b) => {
      const aU = unlocked[a.id] ? 1 : 0;
      const bU = unlocked[b.id] ? 1 : 0;
      if (aU !== bU) return bU - aU; // unlocked first
      return tierOrder[a.tier] - tierOrder[b.tier];
    });
  }, [unlocked]);

  const totalUnlocked = Object.keys(unlocked).length;

  return (
    <div className="w-full max-w-[720px] mx-auto px-4 py-2 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text-strong)" }}>Badges</h2>
        <span className="text-[11px] font-mono px-2 py-1 rounded-[4px] border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>
          {totalUnlocked} / {BADGE_DEFS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-muted)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(totalUnlocked / BADGE_DEFS.length) * 100}%`, background: "var(--primary)" }}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sorted.map((def) => (
          <BadgeCard key={def.id} def={def} unlockedAt={unlocked[def.id]} />
        ))}
      </div>
    </div>
  );
}
