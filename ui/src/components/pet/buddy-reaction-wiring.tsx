import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { BUDDY_MESSAGES, ROUTE_TIPS, useBuddyReactionStore } from "@/store/buddy-reaction-store";
import { useSubmissionResultsStore } from "@/store/submission-results-store";

function tipForPath(pathname: string) {
  if (pathname === "/editor" || pathname.startsWith("/editor/")) {
    return ROUTE_TIPS["/editor"];
  }
  if (pathname === "/campaigns" || pathname.startsWith("/campaigns/")) {
    return ROUTE_TIPS["/campaigns"];
  }
  if (pathname === "/leaderboard" || pathname.startsWith("/leaderboard/")) {
    return ROUTE_TIPS["/leaderboard"];
  }
  return null;
}

function outcomeKey(state: {
  summary: { total: number; succeeded: number; failed: number } | null;
  updatedAt: number;
}) {
  if (!state.summary || state.updatedAt <= 0) return null;
  return `${state.updatedAt}:${state.summary.total}:${state.summary.succeeded}:${state.summary.failed}`;
}

export function reactToSubmissionOutcome(
  summary: { total: number; succeeded: number; failed: number } | null,
) {
  if (!summary) return;

  const { celebrate, sad } = useBuddyReactionStore.getState();
  if (summary.succeeded > 0) {
    celebrate(BUDDY_MESSAGES.celebrate);
    return;
  }
  if (summary.failed > 0) {
    sad(BUDDY_MESSAGES.sad);
  }
}

export function BuddyReactionWiring() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showTip = useBuddyReactionStore((state) => state.showTip);
  const lastOutcomeKey = useRef<string | null>(null);

  useEffect(() => {
    const initial = useSubmissionResultsStore.getState();
    const initialKey = outcomeKey(initial);
    if (initialKey) {
      lastOutcomeKey.current = initialKey;
    }

    return useSubmissionResultsStore.subscribe((state) => {
      const key = outcomeKey(state);
      if (!key || key === lastOutcomeKey.current) return;
      lastOutcomeKey.current = key;
      reactToSubmissionOutcome(state.summary);
    });
  }, []);

  useEffect(() => {
    const tip = tipForPath(pathname);
    if (!tip) return;
    showTip(tip);
  }, [pathname, showTip]);

  return null;
}
