const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  try {
    const publicDir = path.join(__dirname, '..', 'public');
    const src = path.join(publicDir, 'logo.png');
    const iconsDir = path.join(publicDir, 'icons');

    if (!fs.existsSync(src)) {
      console.error('Source logo not found at public/logo.png');
      process.exit(1);
    }
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir);
    }

    const sizes = [192, 512];
    // Maskable icons are cropped to a circle by Android, so the logo must sit
    // inside the safe zone (inner ~80% circle). Scale it to 60% of the canvas
    // and center it on the manifest's background color (#000000).
    const MASKABLE_SCALE = 0.6;
    // PNG is lossless — `quality` is a JPEG/WebP option and, passed to the PNG
    // encoder without `palette`, corrupts the output (everything goes
    // transparent). Only compressionLevel applies here.
    const PNG_OPTS = { compressionLevel: 9 };

    for (const size of sizes) {
      const out = path.join(iconsDir, `icon-${size}.png`);
      await sharp(src)
        .resize(size, size, { fit: 'cover' })
        .png(PNG_OPTS)
        .toFile(out);
      console.log(`Generated ${out}`);

      const maskableOut = path.join(iconsDir, `icon-${size}-maskable.png`);
      const logoSize = Math.round(size * MASKABLE_SCALE);
      const logoBuffer = await sharp(src)
        .resize(logoSize, logoSize, { fit: 'cover' })
        .png()
        .toBuffer();

      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        },
      })
        .composite([{ input: logoBuffer, gravity: 'center' }])
        .png(PNG_OPTS)
        .toFile(maskableOut);
      console.log(`Generated ${maskableOut}`);
    }

    console.log('Icons generated successfully.');
  } catch (e) {
    console.error('Failed to generate icons:', e);
    process.exit(1);
  }
})();
