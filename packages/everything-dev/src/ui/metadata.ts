export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

export interface SocialImageMetaOptions {
  imageUrl: string;
  title: string;
  description: string;
  siteName?: string;
  siteUrl?: string;
  type?: string;
  alt?: string;
  width?: number;
  height?: number;
  mimeType?: string;
}

export function getSocialImageMeta(options: SocialImageMetaOptions) {
  const {
    imageUrl,
    title,
    description,
    siteName,
    siteUrl,
    type = "website",
    alt,
    width = SOCIAL_IMAGE_WIDTH,
    height = SOCIAL_IMAGE_HEIGHT,
    mimeType = "image/png",
  } = options;

  return [
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:image", content: imageUrl },
    { property: "og:image:type", content: mimeType },
    { property: "og:image:width", content: String(width) },
    { property: "og:image:height", content: String(height) },
    ...(alt ? [{ property: "og:image:alt", content: alt }] : []),
    ...(siteName ? [{ property: "og:site_name", content: siteName }] : []),
    ...(siteUrl ? [{ property: "og:url", content: siteUrl }] : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
    ...(alt ? [{ name: "twitter:image:alt", content: alt }] : []),
  ];
}

export interface DotIconSvgOptions {
  size?: number;
  color?: string;
  radius?: number;
  background?: string;
}

export function createDotIconSvg(options: DotIconSvgOptions = {}) {
  const {
    size = 64,
    color = "#111111",
    radius = size * 0.34,
    background = "transparent",
  } = options;
  const center = size / 2;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}" />
  <circle cx="${center}" cy="${center}" r="${radius}" fill="${color}" />
</svg>`;
}

export function createPngIcoBuffer(png: Uint8Array, width: number, height: number) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);

  header[6] = width >= 256 ? 0 : width;
  header[7] = height >= 256 ? 0 : height;
  header[8] = 0;
  header[9] = 0;

  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, png.byteLength, true);
  view.setUint32(18, 22, true);

  const ico = new Uint8Array(22 + png.byteLength);
  ico.set(header, 0);
  ico.set(png, 22);
  return ico;
}
