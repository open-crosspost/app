import { z } from "every-plugin/zod";

export enum Platform {
  UNKNOWN = "unknown",
  TWITTER = "twitter",
  FARCASTER = "farcaster",
}

export type PlatformName = Platform;

export const PlatformSchema = z.nativeEnum(Platform);

export const SUPPORTED_PLATFORMS = [Platform.TWITTER, Platform.FARCASTER] as const;
export type SupportedPlatformName = (typeof SUPPORTED_PLATFORMS)[number];

export const SupportedPlatformSchema = z.enum([Platform.TWITTER, Platform.FARCASTER]);

export function isPlatformSupported(platform: Platform): platform is SupportedPlatformName {
  return SUPPORTED_PLATFORMS.includes(platform as SupportedPlatformName);
}
