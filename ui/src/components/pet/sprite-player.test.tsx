import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpritePlayer } from "./sprite-player";

describe("SpritePlayer", () => {
  let matchMediaMatches = false;
  let animateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matchMediaMatches = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: matchMediaMatches && query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    animateMock = vi.fn((_keyframes: Keyframe[], options?: KeyframeAnimationOptions) => {
      const iterations = options?.iterations ?? 1;
      const loopsForever = iterations === Number.POSITIVE_INFINITY;
      let resolveFinished: () => void = () => {};
      const finished = new Promise<void>((resolve) => {
        resolveFinished = resolve;
      });
      if (!loopsForever) {
        queueMicrotask(() => resolveFinished());
      }
      return {
        finished,
        cancel: vi.fn(),
      };
    });
    HTMLElement.prototype.animate = animateMock as unknown as typeof HTMLElement.prototype.animate;
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calls onStateDone after a non-looping state finishes once", async () => {
    const onStateDone = vi.fn();
    render(
      <SpritePlayer sheetUrl="/pet/spritesheet.webp" state="celebrate" onStateDone={onStateDone} />,
    );

    expect(animateMock).toHaveBeenCalled();
    const options = animateMock.mock.calls[0]?.[1] as KeyframeAnimationOptions;
    expect(options.iterations).toBe(1);
    expect(String(options.easing)).toContain("steps(4");

    await waitFor(() => expect(onStateDone).toHaveBeenCalledTimes(1));
  });

  it("does not call onStateDone for looping idle", async () => {
    const onStateDone = vi.fn();
    render(
      <SpritePlayer sheetUrl="/pet/spritesheet.webp" state="idle" onStateDone={onStateDone} />,
    );

    expect(animateMock).toHaveBeenCalled();
    const options = animateMock.mock.calls[0]?.[1] as KeyframeAnimationOptions;
    expect(options.iterations).toBe(Number.POSITIVE_INFINITY);

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(onStateDone).not.toHaveBeenCalled();
  });

  it("skips WAAPI under prefers-reduced-motion for sad and still finishes", async () => {
    matchMediaMatches = true;
    vi.useFakeTimers();
    const onStateDone = vi.fn();

    render(<SpritePlayer sheetUrl="/pet/spritesheet.webp" state="sad" onStateDone={onStateDone} />);

    expect(animateMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000 * 4);
    expect(onStateDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("skips WAAPI under prefers-reduced-motion for celebrate and still finishes", async () => {
    matchMediaMatches = true;
    vi.useFakeTimers();
    const onStateDone = vi.fn();

    render(
      <SpritePlayer sheetUrl="/pet/spritesheet.webp" state="celebrate" onStateDone={onStateDone} />,
    );

    expect(animateMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000 * 4);
    expect(onStateDone).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
