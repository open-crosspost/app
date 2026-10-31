import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Buddy } from "./buddy";

const HIDDEN_KEY = "buddy:hidden";
const POSITION_KEY = "buddy:position";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("Buddy", () => {
  beforeEach(() => {
    localStorage.clear();
    window.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the draggable buddy by default", () => {
    render(<Buddy />);
    expect(screen.getByTestId("buddy")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Buddy — drag to move" })).toBeTruthy();
  });

  it("dismisses and persists the dismissed choice", () => {
    render(<Buddy />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss Buddy" }));
    expect(screen.queryByTestId("buddy")).toBeNull();
    expect(screen.getByRole("button", { name: "Bring back Buddy" })).toBeTruthy();
    expect(localStorage.getItem(HIDDEN_KEY)).toBe("1");
  });

  it("stays dismissed across remounts until restored", () => {
    localStorage.setItem(HIDDEN_KEY, "1");
    const { unmount } = render(<Buddy />);
    expect(screen.queryByTestId("buddy")).toBeNull();
    unmount();
    render(<Buddy />);
    expect(screen.queryByTestId("buddy")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Bring back Buddy" }));
    expect(screen.getByTestId("buddy")).toBeTruthy();
    expect(localStorage.getItem(HIDDEN_KEY)).toBe("0");
  });

  it("restores a clamped persisted position on mount", () => {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ x: 99999, y: 99999 }));
    render(<Buddy />);
    const buddy = screen.getByTestId("buddy");
    expect(buddy.style.left).not.toBe("99999px");
  });
});
