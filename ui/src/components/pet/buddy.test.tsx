import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUDDY_MESSAGES, useBuddyReactionStore } from "@/store/buddy-reaction-store";
import { renderWithI18n } from "@/test/render-with-i18n";
import { Buddy } from "./buddy";

vi.mock("./buddy-reaction-wiring", () => ({
  BuddyReactionWiring: () => null,
}));

const HIDDEN_KEY = "buddy:hidden";
const POSITION_KEY = "buddy:position";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function tapBuddy() {
  const buddy = screen.getByRole("button", { name: "Buddy — drag to move" });
  fireEvent.pointerDown(buddy, { clientX: 20, clientY: 20 });
  fireEvent.pointerUp(buddy, { clientX: 20, clientY: 20 });
  return buddy;
}

describe("Buddy", () => {
  beforeEach(() => {
    localStorage.clear();
    useBuddyReactionStore.getState().reset();
    window.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    cleanup();
    useBuddyReactionStore.getState().reset();
    vi.useRealTimers();
  });

  it("renders the draggable buddy by default", () => {
    renderWithI18n(<Buddy />);
    expect(screen.getByTestId("buddy")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Buddy — drag to move" })).toBeTruthy();
  });

  it("reveals dismiss on tap and hides it after a few seconds", () => {
    vi.useFakeTimers();
    renderWithI18n(<Buddy />);
    const dismiss = screen.getByRole("button", { name: "Dismiss Buddy" });
    expect(dismiss.className).toContain("hidden");

    tapBuddy();
    expect(dismiss.className).toContain("flex");

    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(dismiss.className).toContain("hidden");
  });

  it("dismisses and persists the dismissed choice", () => {
    renderWithI18n(<Buddy />);
    tapBuddy();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Buddy" }));
    expect(screen.queryByTestId("buddy")).toBeNull();
    expect(screen.getByRole("button", { name: "Bring back Buddy" })).toBeTruthy();
    expect(localStorage.getItem(HIDDEN_KEY)).toBe("1");
  });

  it("stays dismissed across remounts until restored", () => {
    localStorage.setItem(HIDDEN_KEY, "1");
    const { unmount } = renderWithI18n(<Buddy />);
    expect(screen.queryByTestId("buddy")).toBeNull();
    unmount();
    renderWithI18n(<Buddy />);
    expect(screen.queryByTestId("buddy")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Bring back Buddy" }));
    expect(screen.getByTestId("buddy")).toBeTruthy();
    expect(localStorage.getItem(HIDDEN_KEY)).toBe("0");
  });

  it("restores a clamped persisted position on mount", () => {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ x: 99999, y: 99999 }));
    renderWithI18n(<Buddy />);
    const buddy = screen.getByTestId("buddy");
    expect(buddy.style.left).not.toBe("99999px");
  });

  it("renders a localized celebrate bubble from the reaction store", () => {
    useBuddyReactionStore.getState().celebrate(BUDDY_MESSAGES.celebrate);
    renderWithI18n(<Buddy />);
    expect(screen.getByTestId("buddy-tip").textContent).toContain("LETS GOOO");
  });
});
