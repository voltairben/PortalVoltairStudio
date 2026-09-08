/**
 * Generates PWA icons from the brand logo.
 * Run: npm run icons
 *
 * Source: Brand Assets/VoltairLogo1.png  (persimmon emblem on black)
 * Output: public/icons/*  +  src/app/icon.png  +  src/app/apple-icon.png
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "Brand Assets", "VoltairLogo1.png");
const OBSIDIAN = { r: 10, g: 10, b: 10, alpha: 1 };

/** Square canvas, logo centered at `scale` of the canvas. */
async function icon(size, scale, outPath) {
  const inner = Math.round(size * scale);
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: OBSIDIAN },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outPath);
  console.log("✓", path.relative(ROOT, outPath));
}

await mkdir(path.join(ROOT, "public", "icons"), { recursive: true });

await icon(192, 0.78, path.join(ROOT, "public/icons/icon-192x192.png"));
await icon(512, 0.78, path.join(ROOT, "public/icons/icon-512x512.png"));
// Maskable needs ~20% safe padding on every edge.
await icon(512, 0.6, path.join(ROOT, "public/icons/icon-maskable-512x512.png"));
await icon(180, 0.74, path.join(ROOT, "public/icons/apple-touch-icon.png"));
await icon(512, 0.78, path.join(ROOT, "src/app/icon.png"));
await icon(180, 0.74, path.join(ROOT, "src/app/apple-icon.png"));

console.log("\nIcons generated.");
