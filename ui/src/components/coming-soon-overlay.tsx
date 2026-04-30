import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { CursorFollower } from "@/components/cursor-follower";
import { UnderConstruction } from "@/components/under-construction";

const MIN_CLICK_MS = 4000;
const MAX_IDLE_MS = 8000;
const FADE_SEC = 2;

export function ComingSoonOverlay({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  const [start] = useState(() => Date.now());

  const trigger = useCallback(() => {
    if (Date.now() - start >= MIN_CLICK_MS) setShown(true);
  }, [start]);

  useEffect(() => {
    const idle = setTimeout(() => setShown(true), MAX_IDLE_MS);
    window.addEventListener("click", trigger);
    return () => {
      clearTimeout(idle);
      window.removeEventListener("click", trigger);
    };
  }, [trigger]);

  return (
    <div className="relative">
      <CursorFollower active={!shown} />

      <AnimatePresence>
        {!shown && (
          <motion.div
            key="content"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_SEC, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shown && (
          <motion.div
            key="overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: FADE_SEC, ease: "easeInOut" }}
          >
            <UnderConstruction className="w-72 sm:w-96 md:w-[28rem]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
