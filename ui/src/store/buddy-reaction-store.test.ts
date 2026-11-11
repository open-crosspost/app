import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUBBLE_DISMISS_MS,
  BUDDY_MESSAGES,
  TIP_COOLDOWN_MS,
  useBuddyReactionStore,
} from "./buddy-reaction-store";

describe("buddy reaction store", () => {
  beforeEach(() => {
    localStorage.clear();
    useBuddyReactionStore.getState().reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    useBuddyReactionStore.getState().reset();
    vi.useRealTimers();
  });

  it("celebrates with bubble and returns sprite to idle on completeReaction", () => {
    const store = useBuddyReactionStore.getState();
    store.celebrate();

    expect(useBuddyReactionStore.getState().spriteState).toBe("celebrate");
    expect(useBuddyReactionStore.getState().bubble?.message).toBe(BUDDY_MESSAGES.celebrate);

    useBuddyReactionStore.getState().completeReaction();
    expect(useBuddyReactionStore.getState().spriteState).toBe("idle");
    expect(useBuddyReactionStore.getState().bubble?.message).toBe(BUDDY_MESSAGES.celebrate);
  });

  it("sads once and ignores duplicate sad while already sad", () => {
    useBuddyReactionStore.getState().sad();
    useBuddyReactionStore.getState().sad("buddy.sad.custom");

    expect(useBuddyReactionStore.getState().spriteState).toBe("sad");
    expect(useBuddyReactionStore.getState().bubble?.message).toBe(BUDDY_MESSAGES.sad);
  });

  it("lets sad interrupt an in-flight celebrate", () => {
    useBuddyReactionStore.getState().celebrate();
    useBuddyReactionStore.getState().sad();

    expect(useBuddyReactionStore.getState().spriteState).toBe("sad");
    expect(useBuddyReactionStore.getState().bubble?.id).toBe("reaction:sad");
  });

  it("auto-dismisses the speech bubble and manual dismiss clears the timer", () => {
    useBuddyReactionStore.getState().celebrate();
    expect(useBuddyReactionStore.getState().bubble).not.toBeNull();

    useBuddyReactionStore.getState().dismissBubble();
    expect(useBuddyReactionStore.getState().bubble).toBeNull();

    vi.advanceTimersByTime(BUBBLE_DISMISS_MS);
    expect(useBuddyReactionStore.getState().bubble).toBeNull();
  });

  it("auto-dismisses after the bubble duration", () => {
    useBuddyReactionStore.getState().celebrate();
    vi.advanceTimersByTime(BUBBLE_DISMISS_MS);
    expect(useBuddyReactionStore.getState().bubble).toBeNull();
  });

  it("respects tip cooldown across remounts via localStorage", () => {
    const tip = { id: "tip:editor", message: BUDDY_MESSAGES.tipEditor };

    useBuddyReactionStore.getState().showTip(tip);
    expect(useBuddyReactionStore.getState().bubble?.id).toBe("tip:editor");

    useBuddyReactionStore.getState().dismissBubble();
    useBuddyReactionStore.getState().reset();

    useBuddyReactionStore.getState().showTip(tip);
    expect(useBuddyReactionStore.getState().bubble).toBeNull();

    vi.advanceTimersByTime(TIP_COOLDOWN_MS);
    useBuddyReactionStore.getState().showTip(tip);
    expect(useBuddyReactionStore.getState().bubble?.id).toBe("tip:editor");
  });

  it("skips tips during reactions", () => {
    useBuddyReactionStore.getState().celebrate();
    useBuddyReactionStore.getState().showTip({ id: "tip:campaigns", message: "hi" }, 0);
    expect(useBuddyReactionStore.getState().bubble?.id).toBe("reaction:celebrate");
  });
});
