import { z } from "every-plugin/zod";
export declare enum Platform {
    UNKNOWN = "unknown",
    TWITTER = "twitter",
    FARCASTER = "farcaster"
}
export type PlatformName = Platform;
export declare const PlatformSchema: z.ZodEnum<typeof Platform>;
export declare const SUPPORTED_PLATFORMS: readonly [Platform.TWITTER, Platform.FARCASTER];
export type SupportedPlatformName = (typeof SUPPORTED_PLATFORMS)[number];
export declare const SupportedPlatformSchema: z.ZodEnum<{
    twitter: Platform.TWITTER;
    farcaster: Platform.FARCASTER;
}>;
export declare function isPlatformSupported(platform: Platform): platform is SupportedPlatformName;
