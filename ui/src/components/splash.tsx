import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { APP_NAME, TITLE_TEXT_SHADOW } from "@/lib/branding";
import { UnderConstruction } from "./under-construction";

interface SplashProps {
  visible: boolean;
  onDismiss: () => void;
}

export function Splash({ visible, onDismiss }: SplashProps) {
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const pressTimeout = setTimeout(() => setPressed(true), 4000);
    const dismissTimeout = setTimeout(onDismiss, 4200);
    return () => {
      clearTimeout(pressTimeout);
      clearTimeout(dismissTimeout);
    };
  }, [visible, onDismiss]);

  useEffect(() => {
    if (!visible) setPressed(false);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center justify-center gap-6 px-4 pb-[8vh] text-center sm:px-6"
          >
            <h1
              className="text-[3.2em] leading-[1.1] font-semibold tracking-tight"
              style={{ textShadow: TITLE_TEXT_SHADOW }}
            >
              {APP_NAME}
            </h1>
            <UnderConstruction
              label="splash"
              sourceFile="ui/src/components/splash.tsx"
              className="w-full max-w-xl"
              onClick={onDismiss}
              skipNavigation
              pressed={pressed}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
