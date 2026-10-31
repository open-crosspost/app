import { create } from "zustand";

export type BuddyTip = {
  id: string;
  message: string;
};

export const SPONSORED_POSTING_TIP: BuddyTip = {
  id: "sponsored-posting",
  message:
    "Psst — your X posts publish through the app's sponsored key. No keys, no deposits from you; the app pays per post.",
};

const SEEN_PREFIX = "buddy:tip:seen:";
const DEFAULT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type BuddyTipState = {
  tip: BuddyTip | null;
  showTip: (tip: BuddyTip, cooldownMs?: number) => void;
  dismissTip: () => void;
};

function lastSeenAt(id: string): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(SEEN_PREFIX + id) ?? 0);
}

function markSeen(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEN_PREFIX + id, String(Date.now()));
}

export const useBuddyTipStore = create<BuddyTipState>((set, get) => ({
  tip: null,
  showTip: (tip, cooldownMs = DEFAULT_COOLDOWN_MS) => {
    if (get().tip) return;
    if (Date.now() - lastSeenAt(tip.id) < cooldownMs) return;
    markSeen(tip.id);
    set({ tip });
  },
  dismissTip: () => {
    const current = get().tip;
    if (current) markSeen(current.id);
    set({ tip: null });
  },
}));
