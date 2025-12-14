const fs = require('fs');
const path = require('path');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('The "sharp" package is required. Run: npm install --save-dev sharp');
  process.exit(1);
}

const files = [
  'public/storyvermo_logo.png',
  'public/android-chrome-512x512.png',
  'public/android-chrome-192x192.png'
].map(f => path.resolve(__dirname, '..', f));

async function run() {
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      console.warn('File not found, skipping:', filePath);
      continue;
    }

    const parsed = path.parse(filePath);
    const buffer = fs.readFileSync(filePath);
    const origSize = buffer.length;

    console.log('\nProcessing', parsed.base, `(${(origSize/1024).toFixed(1)} KB)`);

    try {
      const image = sharp(buffer, { failOnError: false });
      const metadata = await image.metadata();

      // Determine max dimension to target for resizing (keep original aspect)
      const maxDim = Math.max(metadata.width || 0, metadata.height || 0);
      const targetMax = Math.min(maxDim, 512); // don't upscale; cap at 512

      // Create output names
      const outWebp = path.join(parsed.dir, `${parsed.name}.compressed.webp`);
      const outPng = path.join(parsed.dir, `${parsed.name}.optimized.png`);

      // Create a WebP compressed version (lossy) - typically much smaller
      await image
        .resize({ width: targetMax, height: targetMax, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outWebp);

      const webpSize = fs.statSync(outWebp).size;

      // Create an optimized PNG (lossless-ish but with better compression settings)
      await image
        .resize({ width: targetMax, height: targetMax, fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(outPng);

      const pngSize = fs.statSync(outPng).size;

      console.log(` -> compressed webp: ${(webpSize/1024).toFixed(1)} KB -> ${outWebp}`);
      console.log(` -> optimized png: ${(pngSize/1024).toFixed(1)} KB -> ${outPng}`);

      const webpReduction = (((origSize - webpSize) / origSize) * 100).toFixed(1);
      const pngReduction = (((origSize - pngSize) / origSize) * 100).toFixed(1);

      console.log(`   reduction: webp ${webpReduction}% | png ${pngReduction}%`);

    } catch (err) {
      console.error('Failed to process', parsed.base, err);
    }
  }

  console.log('\nDone. Review the generated `.compressed.webp` and `.optimized.png` files in the `public/` folder.');
  console.log('If you want to replace the originals with the optimized versions, back them up first and then rename the optimized files to the original names.');
}

run().catch(err => { console.error(err); process.exit(1); });
