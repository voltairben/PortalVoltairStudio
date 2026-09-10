/**
 * Builds the source images @capacitor/assets needs (./assets/), from the brand
 * flame. Run once, then `npx @capacitor/assets generate` + `npx cap sync`.
 *
 *   node scripts/generate-app-assets.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "Brand Assets", "VoltairLogo1.png"); // flame on transparent
const OBSIDIAN = { r: 10, g: 10, b: 10, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** Square canvas, flame centered at `scale` of the canvas, on `bg`. */
async function compose(canvas, scale, bg, out) {
  const inner = Math.round(canvas * scale);
  const flame = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: CLEAR })
    .toBuffer();
  await sharp({ create: { width: canvas, height: canvas, channels: 4, background: bg } })
    .composite([{ input: flame, gravity: "center" }])
    .png()
    .toFile(out);
  console.log("✓", path.relative(ROOT, out));
}

await mkdir(path.join(ROOT, "assets"), { recursive: true });
const A = (f) => path.join(ROOT, "assets", f);

// iOS app icon + universal fallback — opaque obsidian, flame ~70%. iOS applies
// its own rounding/mask, so no transparency or corners here.
await compose(1024, 0.7, OBSIDIAN, A("icon.png"));

// Android adaptive icon — foreground on transparent inside the ~66% safe zone,
// solid obsidian background layer.
await compose(1024, 0.52, CLEAR, A("icon-foreground.png"));
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: OBSIDIAN } })
  .png()
  .toFile(A("icon-background.png"));
console.log("✓", "assets/icon-background.png");

// Splash — a small centered flame on obsidian. The portal is dark-only, so the
// light and dark splashes are identical.
await compose(2732, 0.2, OBSIDIAN, A("splash.png"));
await compose(2732, 0.2, OBSIDIAN, A("splash-dark.png"));

console.log("\nNext:  npx @capacitor/assets generate  &&  npx cap sync");
