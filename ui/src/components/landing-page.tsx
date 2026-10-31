import { Calendar, Shield, Zap } from "lucide-react";
import { ConnectToNearButton } from "@/components/connect-to-near";

function MarqueeXIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 text-blue-600 dark:text-blue-400"
      aria-hidden="true"
    >
      <path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        fill="currentColor"
      />
    </svg>
  );
}

const marqueeChip =
  "mx-5 inline-flex items-center gap-1.5 text-sm font-bold text-neutral-950 sm:mx-8 sm:gap-2 sm:text-lg dark:text-white";

function MarqueeSegment({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center"
      {...(ariaHidden ? { "aria-hidden": true as const } : {})}
    >
      <span className={marqueeChip}>
        <MarqueeXIcon />
        MULTI-PLATFORM POSTING
      </span>
      <span className={marqueeChip}>
        <Calendar size={20} className="shrink-0 text-purple-600 dark:text-purple-400" aria-hidden />
        SCHEDULE POSTS
      </span>
      <span className={marqueeChip}>
        <Zap size={20} className="shrink-0 text-yellow-600 dark:text-yellow-400" aria-hidden />
        LIGHTNING FAST
      </span>
      <span className={marqueeChip}>
        <Shield size={20} className="shrink-0 text-green-600 dark:text-green-400" aria-hidden />
        SECURE & PRIVATE
      </span>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-[80vh] -mx-2 -mt-2 sm:-mx-4 sm:-mt-4 md:-mx-8 md:-mt-8">
      <div className="flex flex-col items-center justify-center px-4 py-10 sm:py-16 md:py-20">
        <div className="mx-auto w-full max-w-4xl text-center">
          <div className="flex h-72 w-full flex-col items-center justify-center gap-6 sm:h-80">
            <h1 className="max-w-full text-3xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Share Your Content
              <br />
              Everywhere at Once
            </h1>

            <p className="mx-auto max-w-2xl px-2 text-sm text-gray-600 sm:px-0 sm:text-lg dark:text-gray-400">
              Post to Twitter, Farcaster, and more social platforms simultaneously. Save time, reach
              more people, and manage everything from one place.
            </p>

            <ConnectToNearButton className="mt-2 h-9 min-w-fit gap-2 px-4 py-2 shadow-[2px_2px_0_0_rgb(0,0,0)] dark:shadow-[2px_2px_0_0_rgba(255,255,255,0.3)]" />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-10">
        <div className="border-y-2 border-primary bg-white py-4 overflow-hidden dark:bg-black">
          <div className="flex w-max items-center animate-marquee whitespace-nowrap">
            <MarqueeSegment />
            <MarqueeSegment ariaHidden />
            <MarqueeSegment ariaHidden />
            <MarqueeSegment ariaHidden />
          </div>
        </div>
      </div>
    </div>
  );
}
