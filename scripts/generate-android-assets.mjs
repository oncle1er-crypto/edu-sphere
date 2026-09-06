import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const background = { r: 255, g: 250, b: 240, alpha: 1 };
const logoPath = "public/logo-gsp.png";

await mkdir("assets", { recursive: true });

async function resizedLogo(size) {
  return sharp(logoPath)
    .resize(size, size, { fit: "inside", withoutEnlargement: false })
    .png({ colours: 256 })
    .toBuffer();
}

const [iconLogo, foregroundLogo, splashLogo] = await Promise.all([
  resizedLogo(690),
  resizedLogo(610),
  resizedLogo(760),
]);

await Promise.all([
  sharp({ create: { width: 1024, height: 1024, channels: 4, background } })
    .composite([{ input: iconLogo, gravity: "centre" }])
    .png({ colours: 256 })
    .toFile("assets/icon-only.png"),
  sharp({ create: { width: 1024, height: 1024, channels: 4, background: { ...background, alpha: 0 } } })
    .composite([{ input: foregroundLogo, gravity: "centre" }])
    .png({ colours: 256 })
    .toFile("assets/icon-foreground.png"),
  sharp({ create: { width: 1024, height: 1024, channels: 4, background } })
    .png({ colours: 2 })
    .toFile("assets/icon-background.png"),
  sharp({ create: { width: 2732, height: 2732, channels: 4, background } })
    .composite([{ input: splashLogo, gravity: "centre" }])
    .png({ colours: 256 })
    .toFile("assets/splash.png"),
]);
