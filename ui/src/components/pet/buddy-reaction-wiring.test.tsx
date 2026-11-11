import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUDDY_MESSAGES, useBuddyReactionStore } from "@/store/buddy-reaction-store";
import { useSubmissionResultsStore } from "@/store/submission-results-store";
import { renderWithI18n } from "@/test/render-with-i18n";
import { BuddyReactionWiring } from "./buddy-reaction-wiring";

const pathnameRef = { current: "/editor" };

vi.mock("@tanstack/react-router", () => ({
  useRouterState: (opts: { select: (state: { location: { pathname: string } }) => string }) =>
    opts.select({ location: { pathname: pathnameRef.current } }),
}));

const successOutcome = {
  summary: { total: 1, succeeded: 1, failed: 0 },
  results: [
    {
      platform: "x",
      userId: "1",
      details: {},
      status: "success" as const,
    },
  ],
  errors: [],
  request: {
    posts: [],
    selectedAccounts: [],
    postType: "post" as const,
  },
};

const failureOutcome = {
  summary: { total: 1, succeeded: 0, failed: 1 },
  results: [],
  errors: [{ message: "nope", code: "FAIL", recoverable: false }],
  request: {
    posts: [],
    selectedAccounts: [],
    postType: "post" as const,
  },
};

describe("BuddyReactionWiring", () => {
  beforeEach(() => {
    localStorage.clear();
    pathnameRef.current = "/editor";
    useBuddyReactionStore.getState().reset();
    useSubmissionResultsStore.getState().clearSubmissionOutcome();
  });

  afterEach(() => {
    cleanup();
    useBuddyReactionStore.getState().reset();
    useSubmissionResultsStore.getState().clearSubmissionOutcome();
  });

  it("celebrates a successful publish outcome once", () => {
    pathnameRef.current = "/manage";
    renderWithI18n(<BuddyReactionWiring />);

    act(() => {
      useSubmissionResultsStore.getState().setSubmissionOutcome(successOutcome);
    });

    expect(useBuddyReactionStore.getState().spriteState).toBe("celebrate");
    expect(useBuddyReactionStore.getState().bubble?.message).toBe(BUDDY_MESSAGES.celebrate);

    act(() => {
      useSubmissionResultsStore.getState().setSubmissionOutcome(successOutcome);
    });
    expect(useBuddyReactionStore.getState().spriteState).toBe("celebrate");
  });

  it("sads on a failed publish outcome", () => {
    pathnameRef.current = "/manage";
    renderWithI18n(<BuddyReactionWiring />);

    act(() => {
      useSubmissionResultsStore.getState().setSubmissionOutcome(failureOutcome);
    });

    expect(useBuddyReactionStore.getState().spriteState).toBe("sad");
    expect(useBuddyReactionStore.getState().bubble?.message).toBe(BUDDY_MESSAGES.sad);
  });

  it("shows a cooldown-aware editor tip", () => {
    renderWithI18n(<BuddyReactionWiring />);
    expect(useBuddyReactionStore.getState().bubble?.id).toBe("tip:editor");

    act(() => {
      useBuddyReactionStore.getState().dismissBubble();
    });
    pathnameRef.current = "/campaigns";
    cleanup();
    renderWithI18n(<BuddyReactionWiring />);
    expect(useBuddyReactionStore.getState().bubble?.id).toBe("tip:campaigns");
  });

  it("shows the leaderboard tip", () => {
    pathnameRef.current = "/leaderboard";
    renderWithI18n(<BuddyReactionWiring />);
    expect(useBuddyReactionStore.getState().bubble?.id).toBe("tip:leaderboard");
    expect(useBuddyReactionStore.getState().bubble?.message).toBe(BUDDY_MESSAGES.tipLeaderboard);
  });

  it("keeps tip cooldown after remount on the same route", () => {
    pathnameRef.current = "/leaderboard";
    renderWithI18n(<BuddyReactionWiring />);
    expect(useBuddyReactionStore.getState().bubble?.id).toBe("tip:leaderboard");

    act(() => {
      useBuddyReactionStore.getState().dismissBubble();
    });
    cleanup();
    useBuddyReactionStore.getState().reset();

    renderWithI18n(<BuddyReactionWiring />);
    expect(useBuddyReactionStore.getState().bubble).toBeNull();
  });

  it("does not react to clearing submission results", () => {
    pathnameRef.current = "/manage";
    renderWithI18n(<BuddyReactionWiring />);
    act(() => {
      useBuddyReactionStore.getState().reset();
      useSubmissionResultsStore.getState().clearSubmissionOutcome();
    });
    expect(useBuddyReactionStore.getState().spriteState).toBe("idle");
    expect(useBuddyReactionStore.getState().bubble).toBeNull();
  });
});
