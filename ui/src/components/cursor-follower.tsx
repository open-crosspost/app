import { motion, useMotionValue, useSpring } from "framer-motion";
import { PenSquare } from "lucide-react";
import { useEffect, useState } from "react";

export function CursorFollower({ active }: { active: boolean }) {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { stiffness: 50, damping: 20 });
  const springY = useSpring(cursorY, { stiffness: 50, damping: 20 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX - 12);
      cursorY.set(e.clientY - 12);
      if (!visible) setVisible(true);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [active, cursorX, cursorY, visible]);

  if (!active) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 z-[60] pointer-events-none text-primary"
      style={{ x: springX, y: springY }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.5 }}
      exit={{ opacity: 0, scale: 0.5 }}
    >
      <PenSquare size={24} />
    </motion.div>
  );
}
