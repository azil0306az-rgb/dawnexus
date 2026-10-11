import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

async function optimize() {
  const dir = path.resolve('public/brand');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));

  console.log('Optimizing brand images in:', dir);
  for (const file of files) {
    const inputPath = path.join(dir, file);
    const baseName = path.basename(file, '.png');
    const outputPath = path.join(dir, `${baseName}.webp`);

    const origStats = fs.statSync(inputPath);
    await sharp(inputPath)
      .webp({ quality: 90, effort: 6 })
      .toFile(outputPath);

    const newStats = fs.statSync(outputPath);
    const saved = (((origStats.size - newStats.size) / origStats.size) * 100).toFixed(1);
    console.log(`✓ ${file} (${(origStats.size / 1024).toFixed(1)}KB) -> ${baseName}.webp (${(newStats.size / 1024).toFixed(1)}KB) [${saved}% smaller]`);
  }
}

optimize().catch(console.error);
