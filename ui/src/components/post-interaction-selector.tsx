import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { detectPlatformFromUrl } from "@/lib/utils/url-utils";

export type PostType = "post" | "quote" | "reply";

interface PostInteractionSelectorProps {
  postType: PostType;
  targetUrl: string;
  onPostTypeChange: (type: PostType) => void;
  onTargetUrlChange: (url: string) => void;
}

export function PostInteractionSelector({
  postType,
  targetUrl,
  onPostTypeChange,
  onTargetUrlChange,
}: PostInteractionSelectorProps) {
  const types: PostType[] = ["post", "quote", "reply"];

  // Detect platform from URL
  const detectedPlatform = targetUrl ? detectPlatformFromUrl(targetUrl) : null;

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {types.map((type) => (
          <Button
            key={type}
            size="sm"
            onClick={() => onPostTypeChange(type)}
            className={cn(
              "capitalize px-2.5 sm:px-3",
              postType === type && "bg-success/10 text-foreground hover:bg-success/20",
            )}
          >
            {type}
          </Button>
        ))}
      </div>

      {(postType === "quote" || postType === "reply") && (
        <div className="flex-1 min-w-0">
          <Input
            value={targetUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onTargetUrlChange(e.target.value)}
            placeholder={`Enter URL to ${postType} (e.g., https://x.com/user/status/123)`}
            className={cn(
              "w-full border-2",
              !detectedPlatform && targetUrl && "border-destructive",
              detectedPlatform && "border-success",
            )}
          />
        </div>
      )}
    </div>
  );
}
