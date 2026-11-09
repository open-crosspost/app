import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, PointerSensor, useDraggable, useSensor } from "@dnd-kit/core";
import { X } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useBuddyTipStore } from "@/store/buddy-tip-store";
import { SpritePlayer } from "./sprite-player";

const DISPLAY_SIZE = 96;
const MARGIN = 16;
const POSITION_KEY = "buddy:position";
const HIDDEN_KEY = "buddy:hidden";
const DISMISS_VISIBLE_MS = 3500;
const TAP_MOVE_THRESHOLD_PX = 4;

interface Position {
  x: number;
  y: number;
}

function clampToViewport(position: Position): Position {
  const maxX = Math.max(MARGIN, window.innerWidth - DISPLAY_SIZE - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - DISPLAY_SIZE - MARGIN);
  return {
    x: Math.min(Math.max(MARGIN, position.x), maxX),
    y: Math.min(Math.max(MARGIN, position.y), maxY),
  };
}

function defaultPosition(): Position {
  return { x: MARGIN, y: window.innerHeight - DISPLAY_SIZE - MARGIN };
}

function useBuddyState() {
  const [position, setPosition] = useState<Position>(() =>
    typeof window === "undefined" ? { x: MARGIN, y: MARGIN } : defaultPosition(),
  );
  const [hidden, setHidden] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(HIDDEN_KEY) === "1",
  );

  useEffect(() => {
    const stored = localStorage.getItem(POSITION_KEY);
    if (stored) {
      try {
        setPosition(clampToViewport(JSON.parse(stored) as Position));
      } catch {
        setPosition(defaultPosition());
      }
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setPosition(clampToViewport);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const updatePosition = useCallback((next: Position) => {
    const clamped = clampToViewport(next);
    setPosition(clamped);
    localStorage.setItem(POSITION_KEY, JSON.stringify(clamped));
  }, []);

  const setDismissed = useCallback((dismissed: boolean) => {
    setHidden(dismissed);
    localStorage.setItem(HIDDEN_KEY, dismissed ? "1" : "0");
  }, []);

  return { position, updatePosition, hidden, setDismissed };
}

function BuddySpeechBubble({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-56 rounded-md border border-border bg-popover p-3 text-card-foreground shadow-sm"
      data-testid="buddy-tip"
    >
      <button
        type="button"
        onClick={onDismiss}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Dismiss tip"
        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
      <p className="text-xs leading-snug">{message}</p>
    </div>
  );
}

function DraggableBuddy({
  position,
  flipped,
  onDismiss,
  suppressTapReveal,
}: {
  position: Position;
  flipped: boolean;
  onDismiss: () => void;
  suppressTapReveal: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: "buddy" });
  const tip = useBuddyTipStore((state) => state.tip);
  const dismissTip = useBuddyTipStore((state) => state.dismissTip);
  const [dismissVisible, setDismissVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const revealDismiss = useCallback(() => {
    setDismissVisible(true);
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setDismissVisible(false);
      hideTimerRef.current = null;
    }, DISMISS_VISIBLE_MS);
  }, [clearHideTimer]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const style: CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    zIndex: 9999,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <div style={style} className="group relative" data-testid="buddy">
      {tip ? <BuddySpeechBubble message={tip.message} onDismiss={dismissTip} /> : null}
      <button
        type="button"
        ref={setNodeRef}
        className="block cursor-grab touch-none select-none"
        aria-label="Buddy — drag to move"
        {...listeners}
        {...attributes}
        onPointerDown={(event) => {
          pointerStartRef.current = { x: event.clientX, y: event.clientY };
          listeners?.onPointerDown?.(event as never);
        }}
        onPointerUp={(event) => {
          listeners?.onPointerUp?.(event as never);
          const start = pointerStartRef.current;
          pointerStartRef.current = null;
          if (!start || suppressTapReveal || transform) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.hypot(dx, dy) <= TAP_MOVE_THRESHOLD_PX) {
            revealDismiss();
          }
        }}
      >
        <SpritePlayer
          sheetUrl="/pet/spritesheet.webp"
          state="idle"
          displaySize={DISPLAY_SIZE}
          flipped={flipped}
        />
      </button>
      <button
        type="button"
        onClick={onDismiss}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Dismiss Buddy"
        className={`absolute -top-2 -right-2 h-6 w-6 items-center justify-center rounded-full border border-muted-foreground/30 bg-background text-muted-foreground shadow-sm group-hover:flex hover:text-foreground ${dismissVisible ? "flex" : "hidden"}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function BuddyRestoreTab({ onRestore }: { onRestore: () => void }) {
  return (
    <button
      type="button"
      onClick={onRestore}
      aria-label="Bring back Buddy"
      title="Bring back Buddy"
      className="fixed bottom-4 left-0 z-[9999] flex h-9 w-9 items-center justify-center overflow-hidden rounded-r-full border border-l-0 border-border bg-background/80 shadow-sm backdrop-blur transition-opacity hover:opacity-100"
      data-testid="buddy-restore"
    >
      <SpritePlayer sheetUrl="/pet/spritesheet.webp" state="idle" displaySize={32} />
    </button>
  );
}

export function Buddy() {
  const { position, updatePosition, hidden, setDismissed } = useBuddyState();
  const sensor = useSensor(PointerSensor, {
    activationConstraint: { distance: TAP_MOVE_THRESHOLD_PX },
  });
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 0,
  );
  const [suppressTapReveal, setSuppressTapReveal] = useState(false);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDragStart = () => {
    setSuppressTapReveal(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta } = event;
    updatePosition({ x: position.x + delta.x, y: position.y + delta.y });
    queueMicrotask(() => setSuppressTapReveal(false));
  };

  const flipped = position.x + DISPLAY_SIZE / 2 < viewportWidth / 2;

  if (hidden) {
    return <BuddyRestoreTab onRestore={() => setDismissed(false)} />;
  }

  return (
    <DndContext sensors={[sensor]} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <DraggableBuddy
        position={position}
        flipped={flipped}
        onDismiss={() => setDismissed(true)}
        suppressTapReveal={suppressTapReveal}
      />
    </DndContext>
  );
}
