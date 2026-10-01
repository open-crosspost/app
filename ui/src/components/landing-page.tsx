import { Calendar, Shield, Zap } from "lucide-react";
import { useEffect, useState } from "react";

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

const PITCH_MS = 2000;
const SOON_MS = 5000;
const GLITCH_MS = 480;

type HeroPhase = "pitch" | "soon";

const glitchFrames: Record<HeroPhase, string[]> = {
  soon: ["Sh@re Y0ur C0ntent", "C0m1ng s00n", "C██ing ▓oon", "Coming s0on"],
  pitch: ["C0MING S00N", "Sh@re Y0ur", "3verywhere ▓t 0nce", "Share Y0ur Content"],
};

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
  const [phase, setPhase] = useState<HeroPhase>("pitch");
  const [glitching, setGlitching] = useState(false);
  const [glitchLine, setGlitchLine] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (alive) fn();
      }, ms);
      timers.add(id);
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const hold = (current: HeroPhase) => {
      later(
        () => enter(current === "pitch" ? "soon" : "pitch"),
        current === "pitch" ? PITCH_MS : SOON_MS,
      );
    };

    const enter = (next: HeroPhase) => {
      if (reducedMotion) {
        setPhase(next);
        hold(next);
        return;
      }

      const frames = glitchFrames[next];
      setGlitching(true);
      frames.forEach((line, index) => {
        later(() => setGlitchLine(line), index * 80);
      });
      later(() => setPhase(next), GLITCH_MS / 2);
      later(() => {
        setGlitchLine(null);
        setGlitching(false);
        hold(next);
      }, GLITCH_MS);
    };

    hold("pitch");

    return () => {
      alive = false;
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);

  const headline = glitchLine ? (
    glitchLine
  ) : phase === "pitch" ? (
    <>
      Share Your Content
      <br />
      Everywhere at Once
    </>
  ) : (
    "Coming soon"
  );

  return (
    <div className="min-h-[80vh] -mx-2 -mt-2 sm:-mx-4 sm:-mt-4 md:-mx-8 md:-mt-8">
      <div className="flex flex-col items-center justify-center px-4 py-10 sm:py-16 md:py-20">
        <div className="mx-auto w-full max-w-4xl text-center">
          <div className="@container flex h-72 w-full flex-col items-center justify-center gap-6 sm:h-80">
            <h1
              className={`max-w-full font-bold tracking-tight ${
                phase === "soon"
                  ? "whitespace-nowrap text-[clamp(1.75rem,11cqi,6.5rem)] leading-none"
                  : "text-3xl leading-tight sm:text-5xl md:text-6xl"
              } ${glitching ? "hero-glitch hero-glitch-copy" : ""}`}
            >
              <span className="sr-only">
                {phase === "pitch"
                  ? "Share Your Content. Everywhere at Once"
                  : "Coming soon. Share everywhere, from one place."}
              </span>
              <span aria-hidden="true">{headline}</span>
            </h1>

            {phase === "pitch" && !glitching ? (
              <p className="mx-auto max-w-2xl px-2 text-sm text-gray-600 sm:px-0 sm:text-lg dark:text-gray-400">
                Post to Twitter, Farcaster, and more social platforms simultaneously. Save time,
                reach more people, and manage everything from one place.
              </p>
            ) : null}
            {phase === "soon" && !glitching ? (
              <p className="mx-auto max-w-2xl px-2 text-base text-gray-600 sm:px-0 sm:text-xl dark:text-gray-400">
                Share everywhere, from one place.
              </p>
            ) : null}
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
