import { useEffect, useRef, useState } from "react";
import { AVATARS, avatarBg, initialOf, useProfileStore } from "../store/useProfileStore";
import { BADGE_DEFS } from "../store/useBadgeStore";
import { useBadgeStore } from "../store/useBadgeStore";
import { useHistoryStore } from "../store/useHistoryStore";
import { useModalBehavior } from "../lib/modal";

const TIER_TEXT: Record<string, string> = {
  bronze: "#c4884a",
  silver: "#a0a0b0",
  gold: "#d4af37",
  diamond: "#64b5f6",
};

export function Avatar({ name, avatarId, size = 24 }: { name: string; avatarId: number; size?: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center font-semibold shrink-0 select-none"
      style={{
        width: size, height: size,
        background: avatarBg(avatarId),
        color: "white",
        fontSize: size * 0.42,
        textShadow: "0 1px 2px rgba(0,0,0,0.35)",
      }}
      aria-hidden
    >
      {initialOf(name)}
    </span>
  );
}

/** First-visit nickname popup (blocking) + profile hub (avatar, name, badges). */
export function ProfileModal({ mode, open, onClose }: {
  mode: "onboard" | "profile";
  open: boolean;
  onClose: () => void;
}) {
  const profile = useProfileStore();
  const unlocked = useBadgeStore((s) => s.unlocked);
  const best = useHistoryStore((s) => s.bestWpm());
  const runs = useHistoryStore((s) => s.results.length);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftAvatar, setDraftAvatar] = useState(profile.avatarId);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalBehavior(mode === "profile" && open, onClose, dialogRef);

  // refresh drafts every time it opens
  useEffect(() => {
    if (open) { setDraftName(profile.name); setDraftAvatar(profile.avatarId); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open ]);

  if (!open) return null;
  const onboard = mode === "onboard";

  const save = () => {
    const n = draftName.trim().slice(0, 24) || "Player";
    if (onboard) profile.completeOnboarding(n, draftAvatar);
    else { profile.setName(n); profile.setAvatarId(draftAvatar); onClose(); }
  };

  const unlockedCount = Object.keys(unlocked).length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onboard ? undefined : onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-label={onboard ? "Welcome — pick your nickname" : "Your profile"}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] rounded-xl border overflow-hidden animate-[fadeIn_0.2s_ease] max-h-[88vh] overflow-y-auto"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-strong)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="px-5 py-4 text-center" style={{ background: "linear-gradient(135deg, var(--bg-highlight), var(--bg-card))", borderBottom: "1px solid var(--border)" }}>
          <div className="flex justify-center mb-2">
            <Avatar name={draftName || "?"} avatarId={draftAvatar} size={56} />
          </div>
          <div className="text-[15px] font-semibold" style={{ color: "var(--text-strong)" }}>
            {onboard ? "Welcome to typecheck 👋" : profile.name || "Your profile"}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--text-dim)" }}>
            {onboard ? "Pick a nickname — it shows in races, standings and your card." : "This identity shows everywhere — races, standings, your card."}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-dim)" }}>Avatar</div>
            <div className="flex gap-2 flex-wrap">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setDraftAvatar(a.id)}
                  aria-label={`Avatar ${a.id + 1}`}
                  className="rounded-full p-[2px] border-2"
                  style={{ borderColor: draftAvatar === a.id ? "var(--primary)" : "transparent" }}
                >
                  <Avatar name={draftName || "?"} avatarId={a.id} size={36} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--text-dim)" }}>Nickname</div>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value.slice(0, 24))}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              placeholder="e.g. Speedy"
              maxLength={24}
              autoFocus
              className="w-full h-9 rounded-md border px-3 text-[14px]"
              style={{ background: "var(--bg-subtle)", borderColor: "var(--border)", color: "var(--text-strong)" }}
            />
          </div>

          {!onboard && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-dim)" }}>Badges</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded border" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-dim)" }}>
                  {unlockedCount} / {BADGE_DEFS.length} • best {best || "—"} WPM • {runs} runs
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 max-h-[180px] overflow-y-auto pr-0.5">
                {BADGE_DEFS.map((d) => {
                  const un = !!unlocked[d.id];
                  return (
                    <div key={d.id} title={un ? `${d.name} — ${d.desc}` : `${d.name} — locked`} className="rounded-md border p-1.5 text-center" style={{ background: un ? "var(--primary-soft)" : "var(--bg-muted)", borderColor: un ? "var(--primary-border)" : "var(--border)", opacity: un ? 1 : 0.45 }}>
                      <div className="text-[15px] font-mono font-bold leading-none" style={{ color: un ? TIER_TEXT[d.tier] : "var(--text-faint)" }}>{un ? d.icon : "🔒"}</div>
                      <div className="text-[8px] font-medium mt-1 truncate" style={{ color: un ? "var(--text-strong)" : "var(--text-faint)" }}>{d.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!onboard && (
              <button onClick={onClose} className="h-8 px-4 rounded-md text-[12px] font-medium border" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-dim)" }}>Cancel</button>
            )}
            <button onClick={save} disabled={!draftName.trim()} className="flex-1 h-8 px-4 rounded-md text-[12px] font-semibold disabled:opacity-40" style={{ background: "var(--text-strong)", color: "var(--bg)" }}>
              {onboard ? "Start typing →" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
