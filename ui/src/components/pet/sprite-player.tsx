import { useEffect, useRef } from "react";

export type SpriteStateName = "idle" | "celebrate" | "sad" | "wave" | "sleep";

export interface SpriteAnimation {
  row: number;
  frames: number;
  loop: boolean;
  frameMs?: number;
}

export const SPRITE_SHEET_STATES: Record<SpriteStateName, SpriteAnimation> = {
  idle: { row: 0, frames: 4, loop: true },
  celebrate: { row: 1, frames: 4, loop: false },
  sad: { row: 2, frames: 4, loop: false },
  wave: { row: 3, frames: 4, loop: false },
  sleep: { row: 4, frames: 4, loop: true },
};

interface SpritePlayerProps {
  sheetUrl: string;
  state: SpriteStateName;
  displaySize?: number;
  flipped?: boolean;
  onStateDone?: () => void;
}

function usePrefersReducedMotion() {
  const ref = useRef(false);
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    ref.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return ref.current;
}

export function SpritePlayer({
  sheetUrl,
  state,
  displaySize = 96,
  flipped = false,
  onStateDone,
}: SpritePlayerProps) {
  const columns = 4;
  const rows = 5;
  const stripRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onStateDone);
  doneRef.current = onStateDone;
  const reducedMotion = usePrefersReducedMotion();

  const animation = SPRITE_SHEET_STATES[state];

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    const frameMs = animation.frameMs ?? 140;
    const distance = displaySize * animation.frames;

    if (reducedMotion || typeof el.animate !== "function") {
      if (!animation.loop) {
        const timeout = window.setTimeout(() => doneRef.current?.(), frameMs * animation.frames);
        return () => window.clearTimeout(timeout);
      }
      return;
    }

    const anim = el.animate(
      [{ transform: "translateX(0)" }, { transform: `translateX(-${distance}px)` }],
      {
        duration: frameMs * animation.frames,
        easing: `steps(${animation.frames}, jump-end)`,
        iterations: animation.loop ? Number.POSITIVE_INFINITY : 1,
        fill: "forwards",
      },
    );
    anim.finished.then(() => doneRef.current?.()).catch(() => {});
    return () => anim.cancel();
  }, [animation, displaySize, flipped, reducedMotion]);

  return (
    <div
      style={{
        width: displaySize,
        height: displaySize,
        overflow: "hidden",
        transform: flipped ? "scaleX(-1)" : undefined,
      }}
    >
      <div
        style={{
          width: displaySize,
          height: displaySize * rows,
          transform: `translateY(-${animation.row * displaySize}px)`,
        }}
      >
        <div
          ref={stripRef}
          style={{
            width: displaySize * columns,
            height: displaySize * rows,
            backgroundImage: `url(${sheetUrl})`,
            backgroundSize: "100% 100%",
            imageRendering: "auto",
            transformOrigin: "center",
          }}
        />
      </div>
    </div>
  );
}
