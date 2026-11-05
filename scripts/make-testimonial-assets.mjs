// Produces the award photos in public/testimonials/ from the git-ignored originals in Testimonials/.
// Run with: node scripts/make-testimonial-assets.mjs
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const sourcePath = (name) => fileURLToPath(new URL(`../Testimonials/${name}`, import.meta.url));
const publicPath = (name) =>
  fileURLToPath(new URL(`../public/testimonials/${name}`, import.meta.url));

// Both originals are 960x1280 phone photos. 800px tall covers the awards strip at 2x.
const photos = [
  { source: "KZU Awards All.jpg", output: "awards-certificates.webp" },
  { source: "KZU Awards.jpg", output: "awards-quantum-club.webp" },
];

await mkdir(publicPath(""), { recursive: true });

for (const { source, output } of photos) {
  // rotate() applies the camera's EXIF orientation. sharp then drops the EXIF, location included.
  await sharp(sourcePath(source))
    .rotate()
    .resize({ height: 800 })
    .webp({ quality: 72 })
    .toFile(publicPath(output));
}
