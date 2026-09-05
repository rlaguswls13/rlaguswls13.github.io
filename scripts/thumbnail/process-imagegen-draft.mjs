import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [, , input, output] = process.argv;
if (!input || !output) throw new Error('usage: node process-imagegen-draft.mjs <input> <output>');
await fs.mkdir(path.dirname(output), { recursive: true });
await sharp(input)
  .resize(576, 384, { fit: 'cover' })
  .flatten({ background: '#ffffff' })
  .removeAlpha()
  .webp({ quality: 90 })
  .toFile(output);
console.log(output);
