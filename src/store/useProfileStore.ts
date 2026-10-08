import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ── Identity: one nickname + dummy avatar, used everywhere ── */

export const AVATARS = [
  { id: 0, bg: "linear-gradient(135deg,#5E6AD2,#9B8AFB)" },
  { id: 1, bg: "linear-gradient(135deg,#0EA5E9,#22D3EE)" },
  { id: 2, bg: "linear-gradient(135deg,#10B981,#6EE7B7)" },
  { id: 3, bg: "linear-gradient(135deg,#F59E0B,#FBBF24)" },
  { id: 4, bg: "linear-gradient(135deg,#E11D48,#FB7185)" },
  { id: 5, bg: "linear-gradient(135deg,#8B5CF6,#EC4899)" },
  { id: 6, bg: "linear-gradient(135deg,#475569,#94A3B8)" },
  { id: 7, bg: "linear-gradient(135deg,#B8912F,#E8C468)" },
] as const;

export const avatarBg = (id: number): string =>
  AVATARS.find((a) => a.id === id)?.bg ?? AVATARS[0].bg;

export function initialOf(name: string): string {
  const t = name.trim();
  return t ? t[0]!.toUpperCase() : "?";
}

type ProfileState = {
  name: string;
  avatarId: number;
  hasOnboarded: boolean;
  setName: (n: string) => void;
  setAvatarId: (id: number) => void;
  completeOnboarding: (name: string, avatarId: number) => void;
};

function seedName(): string {
  // Adopt legacy names so returning users are never re-prompted.
  try {
    const legacy =
      localStorage.getItem("typecraft_name") ||
      localStorage.getItem("typecraft_card_name") ||
      "";
    return legacy.trim().slice(0, 24);
  } catch { return ""; }
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      name: "",
      avatarId: Math.floor(Math.random() * AVATARS.length),
      hasOnboarded: false,
      setName: (n) => set({ name: n.trim().slice(0, 24) }),
      setAvatarId: (avatarId) => set({ avatarId }),
      completeOnboarding: (name, avatarId) =>
        set({ name: name.trim().slice(0, 24) || "Player", avatarId, hasOnboarded: true }),
    }),
    {
      name: "typecheck_profile_v1",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProfileState>;
        const out = { ...current, ...p };
        // First run: inherit a legacy nickname if one exists (no popup then).
        if (!out.hasOnboarded && !out.name) {
          const seed = seedName();
          if (seed) { out.name = seed; out.hasOnboarded = true; }
        }
        if (typeof out.name !== "string") out.name = "";
        out.name = out.name.slice(0, 24);
        if (!Number.isInteger(out.avatarId) || out.avatarId < 0 || out.avatarId >= AVATARS.length) {
          out.avatarId = current.avatarId;
        }
        if (typeof out.hasOnboarded !== "boolean") out.hasOnboarded = out.name.length > 0;
        return out;
      },
    }
  )
);
