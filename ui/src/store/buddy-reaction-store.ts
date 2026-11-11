import { create } from "zustand";

export type BuddyBubble = {
  id: string;
  message: string;
};

export type BuddyReactionSprite = "idle" | "celebrate" | "sad";

export const BUDDY_MESSAGES = {
  celebrate: "buddy.celebrate",
  sad: "buddy.sad",
  tipEditor: "buddy.tip.editor",
  tipCampaigns: "buddy.tip.campaigns",
  tipLeaderboard: "buddy.tip.leaderboard",
  tipSponsored: "buddy.tip.sponsored",
} as const;

export const SPONSORED_POSTING_TIP: BuddyBubble = {
  id: "sponsored-posting",
  message: BUDDY_MESSAGES.tipSponsored,
};

export const ROUTE_TIPS: Record<string, BuddyBubble> = {
  "/editor": { id: "tip:editor", message: BUDDY_MESSAGES.tipEditor },
  "/campaigns": { id: "tip:campaigns", message: BUDDY_MESSAGES.tipCampaigns },
  "/leaderboard": { id: "tip:leaderboard", message: BUDDY_MESSAGES.tipLeaderboard },
};

export const BUBBLE_DISMISS_MS = 4000;
export const TIP_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SEEN_PREFIX = "buddy:tip:seen:";

type BuddyReactionState = {
  spriteState: BuddyReactionSprite;
  bubble: BuddyBubble | null;
  celebrate: (message?: string) => void;
  sad: (message?: string) => void;
  showTip: (tip: BuddyBubble, cooldownMs?: number) => void;
  dismissBubble: () => void;
  completeReaction: () => void;
  reset: () => void;
};

let bubbleTimer: ReturnType<typeof setTimeout> | null = null;

function clearBubbleTimer() {
  if (bubbleTimer != null) {
    clearTimeout(bubbleTimer);
    bubbleTimer = null;
  }
}

function lastSeenAt(id: string): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(SEEN_PREFIX + id) ?? 0);
}

function markSeen(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEN_PREFIX + id, String(Date.now()));
}

function scheduleBubbleDismiss(set: (partial: Partial<BuddyReactionState>) => void) {
  clearBubbleTimer();
  if (typeof window === "undefined") return;
  bubbleTimer = setTimeout(() => {
    bubbleTimer = null;
    set({ bubble: null });
  }, BUBBLE_DISMISS_MS);
}

export const useBuddyReactionStore = create<BuddyReactionState>((set, get) => ({
  spriteState: "idle",
  bubble: null,
  celebrate: (message = BUDDY_MESSAGES.celebrate) => {
    if (get().spriteState === "celebrate") return;
    set({
      spriteState: "celebrate",
      bubble: { id: "reaction:celebrate", message },
    });
    scheduleBubbleDismiss(set);
  },
  sad: (message = BUDDY_MESSAGES.sad) => {
    if (get().spriteState === "sad") return;
    set({
      spriteState: "sad",
      bubble: { id: "reaction:sad", message },
    });
    scheduleBubbleDismiss(set);
  },
  showTip: (tip, cooldownMs = TIP_COOLDOWN_MS) => {
    if (get().spriteState !== "idle") return;
    if (get().bubble) return;
    if (Date.now() - lastSeenAt(tip.id) < cooldownMs) return;
    markSeen(tip.id);
    set({ bubble: tip });
    scheduleBubbleDismiss(set);
  },
  dismissBubble: () => {
    const current = get().bubble;
    if (current?.id.startsWith("tip:") || current?.id === SPONSORED_POSTING_TIP.id) {
      markSeen(current.id);
    }
    clearBubbleTimer();
    set({ bubble: null });
  },
  completeReaction: () => {
    if (get().spriteState === "idle") return;
    set({ spriteState: "idle" });
  },
  reset: () => {
    clearBubbleTimer();
    set({ spriteState: "idle", bubble: null });
  },
}));
