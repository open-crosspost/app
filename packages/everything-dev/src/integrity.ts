import { createHash } from "node:crypto";

export function computeSriHash(content: string | Buffer): string {
  return `sha384-${createHash("sha384").update(content).digest("base64")}`;
}

export async function computeSriHashForUrl(url: string): Promise<string | null> {
  try {
    const entryUrl = url.endsWith("/remoteEntry.js")
      ? url
      : url.endsWith("/mf-manifest.json")
        ? `${url.replace(/\/mf-manifest\.json$/, "")}/remoteEntry.js`
        : `${url.replace(/\/$/, "")}/remoteEntry.js`;

    const response = await fetch(entryUrl);
    if (!response.ok) {
      console.warn(`[SRI] Failed to fetch ${entryUrl}: ${response.status} ${response.statusText}`);
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return computeSriHash(buffer);
  } catch (error) {
    console.warn(
      `[SRI] Error computing integrity for ${url}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function verifySriForUrl(url: string, expectedIntegrity: string): Promise<void> {
  const entryUrl = url.endsWith("/remoteEntry.js")
    ? url
    : url.endsWith("/mf-manifest.json")
      ? `${url.replace(/\/mf-manifest\.json$/, "")}/remoteEntry.js`
      : `${url.replace(/\/$/, "")}/remoteEntry.js`;

  const response = await fetch(entryUrl);
  if (!response.ok) {
    console.warn(`[SRI] Failed to fetch ${entryUrl} for verification: ${response.status}`);
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const computed = computeSriHash(buffer);

  if (computed !== expectedIntegrity) {
    throw new Error(
      `[SRI] Integrity check failed for ${entryUrl}\n  Expected: ${expectedIntegrity}\n  Computed: ${computed}`,
    );
  }

  console.log(`[SRI] Integrity verified for ${entryUrl}`);
}
