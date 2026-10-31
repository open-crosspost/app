import blackDotSvg from "@/assets/black-dot.svg";
import builtOnNearSvg from "@/assets/built-on-near.svg";
import { Button } from "./ui/button";

export function Footer() {
  return (
    <footer className="flex justify-between gap-2 px-2 py-4 font-mono text-xs text-muted-foreground sm:px-4 sm:text-sm">
      <div className="flex gap-2">
        <Button asChild>
          <a
            href="https://app.potlock.org/?tab=project&projectId=crosspost.near"
            target="_blank"
            rel="noopener noreferrer"
          >
            donate ❤️
          </a>
        </Button>
        <Button asChild>
          <a href="https://meme.cooking/meme/1634" target="_blank" rel="noopener noreferrer">
            buy $XPOST
          </a>
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <span>a part of</span>
          <a
            href={"https://everything.dev"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <img
              src={blackDotSvg}
              alt="everything"
              className="w-[16px] h-[16px] sm:w-[24px] sm:h-[24px] dark:invert"
            />
          </a>
        </div>
        <div className="w-28 sm:w-36">
          <img src={builtOnNearSvg} alt="built on near" className="w-full h-auto dark:invert" />
        </div>
      </div>
    </footer>
  );
}
