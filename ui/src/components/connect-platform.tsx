import type { PlatformName } from "@crosspost/plugin/types";
import { Platform } from "@crosspost/plugin/types";
import { Twitter } from "lucide-react";
import farcasterSvg from "@/assets/platforms/farcaster.svg";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { capitalize } from "@/lib/utils/string";

interface ConnectPlatformProps {
  platform: PlatformName;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
}

export function ConnectPlatform({
  platform,
  className = "",
  variant = "default",
  size = "sm",
  showIcon = true,
}: ConnectPlatformProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            disabled
            size={size}
            variant={variant}
            className={`gap-2 ${className}`}
          >
            {showIcon &&
              (platform === Platform.TWITTER ? (
                <Twitter size={size === "sm" ? 18 : 24} />
              ) : platform === Platform.FARCASTER ? (
                <img
                  src={farcasterSvg}
                  alt="Farcaster"
                  width={size === "sm" ? 18 : 24}
                  height={size === "sm" ? 18 : 24}
                  className="object-contain"
                />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={size === "sm" ? 16 : 20}
                  height={size === "sm" ? 16 : 20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              ))}
            {`Connect ${capitalize(platform)} Account`}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Account connection is coming soon
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
