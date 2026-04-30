import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import underConstructionImage from "@/assets/under-construction.gif";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const REPOSITORY = "https://github.com/open-crosspost/app";

export function UnderConstruction({ className }: { className?: string }) {
  const handleClick = () => {
    setTimeout(() => {
      window.open(REPOSITORY, "_blank", "noopener,noreferrer");
    }, 150);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={className} style={{ perspective: 800 }}>
            <button
              type="button"
              className="bg-transparent border-0 transition-transform p-4 -m-4"
              style={{ cursor: "pointer" }}
              onClick={handleClick}
              aria-label="under construction - view source"
            >
              <motion.div
                animate={{
                  rotateY: [0, 12, 0, -12, 0],
                  y: [0, -4, 0],
                }}
                transition={{
                  rotateY: { duration: 4, ease: "easeInOut", repeat: Infinity },
                  y: { duration: 3, ease: "easeInOut", repeat: Infinity },
                }}
                whileTap={{ scale: 0.95, rotateY: 0, z: -15 }}
                className="relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                <img
                  src={underConstructionImage}
                  alt="under construction"
                  className="w-full h-auto rounded-xl border border-border object-cover shadow-lg"
                />
              </motion.div>
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className="flex items-center gap-1.5">
            see code and contribute
            <ExternalLink className="w-3 h-3" />
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
