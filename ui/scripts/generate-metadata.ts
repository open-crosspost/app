import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createDotIconSvg,
  createPngIcoBuffer,
  SOCIAL_IMAGE_HEIGHT,
  SOCIAL_IMAGE_WIDTH,
} from "everything-dev/ui/metadata";
import sharp from "sharp";
import { APP_NAME, BRAND_DOT_COLOR, METADATA_IMAGE_ALT } from "../src/lib/branding";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uiDir = path.resolve(__dirname, "..");
const publicDir = path.join(uiDir, "public");

const metadataPath = path.join(publicDir, "metadata.png");

async function main() {
  await mkdir(publicDir, { recursive: true });

  const dotIconSvg = createDotIconSvg({ color: BRAND_DOT_COLOR });
  const dotIconBuffer = Buffer.from(dotIconSvg);

  const dotIconPngBuffer = await sharp(dotIconBuffer).resize(512, 512).png().toBuffer();

  const socialImageSvg = `
    <svg width="${SOCIAL_IMAGE_WIDTH}" height="${SOCIAL_IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f0f0f0;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <text x="50%" y="40%" font-family="system-ui, -apple-system, sans-serif" font-size="80" font-weight="bold" text-anchor="middle" fill="#111111">${APP_NAME}</text>
      <text x="50%" y="55%" font-family="system-ui, -apple-system, sans-serif" font-size="40" text-anchor="middle" fill="#666666">Share your content everywhere at once</text>
    </svg>
  `;

  const socialImageBuffer = Buffer.from(socialImageSvg);
  const socialImagePngBuffer = await sharp(socialImageBuffer)
    .resize(SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT)
    .png()
    .toBuffer();

  await writeFile(metadataPath, socialImagePngBuffer);
  console.log(`✅ Generated ${metadataPath}`);

  const faviconBuffer = await createPngIcoBuffer(dotIconPngBuffer, 32, 32);
  const faviconPath = path.join(publicDir, "favicon.ico");
  await writeFile(faviconPath, faviconBuffer);
  console.log(`✅ Generated ${faviconPath}`);

  const iconSvgPath = path.join(publicDir, "icon.svg");
  await writeFile(iconSvgPath, dotIconSvg);
  console.log(`✅ Generated ${iconSvgPath}`);

  const manifest = {
    name: APP_NAME,
    short_name: APP_NAME,
    description: METADATA_IMAGE_ALT,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };

  const manifestPath = path.join(publicDir, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✅ Generated ${manifestPath}`);

  console.log("✅ All metadata generated successfully!");
}

main().catch((err) => {
  console.error("❌ Error generating metadata:", err);
  process.exit(1);
});
