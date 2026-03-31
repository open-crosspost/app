import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

interface SplashProps {
  visible: boolean;
  onDismiss: () => void;
}

export function Splash({ visible, onDismiss }: SplashProps) {
  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(onDismiss, 4200);
    return () => clearTimeout(timeout);
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background cursor-pointer"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center justify-center gap-6 px-4 pb-[8vh] text-center sm:px-6"
          >
            <h1
              className="text-[3.2em] leading-[1.1] font-semibold tracking-tight"
              style={{
                textShadow: "rgba(0,0,0,0.08) 1px 1px 1px, rgba(0,0,0,0.06) 3px 3px 3px",
              }}
            >
              everything.dev
            </h1>
            <img
              src="https://ipfs.near.social/ipfs/bafkreidhy7zo33wqjxhqsv2dd6dp2wzloitaa4lmj3rzq5zvcdtp2smeaa"
              alt="under construction"
              className="h-auto w-full max-w-xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
