import { getErrorMessage } from "@/lib/error-utils";

// Client-side utility for reading NEAR Social data via the official indexer
// API (see https://near.social/skill.md).

const API_SERVER = "https://api2.near.social";

export type Profile = {
  name?: string;
  about?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  location?: string;
  links?: Record<string, string>;
};

/** Legacy image shape — profiles written through the old contract still carry IPFS refs. */
export type SocialImage = {
  url?: string;
  ipfs_cid?: string;
};

export async function getProfile(accountId: string): Promise<Profile | null> {
  try {
    const response = await fetch(`${API_SERVER}/v1/accounts/${accountId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.has_profile === false) {
      return null;
    }

    return {
      name: data.name ?? undefined,
      about: data.about ?? undefined,
      avatarUrl: data.avatar_url ?? undefined,
      bannerUrl: data.banner_url ?? undefined,
      location: data.location ?? undefined,
      links: data.links ?? {},
    };
  } catch (error) {
    console.error("Error fetching profile:", getErrorMessage(error));
    return null;
  }
}

export const FALLBACK_URL =
  "https://ipfs.near.social/ipfs/bafkreidn5fb2oygegqaldx7ycdmhu4owcrmoxd7ekbzfmeakkobz2ja7qy";

export const getImageUrl = (image: SocialImage | undefined, fallback?: string): string => {
  if (image?.url) return image.url;
  if (image?.ipfs_cid) return `https://ipfs.near.social/ipfs/${image.ipfs_cid}`;
  return fallback || FALLBACK_URL;
};
