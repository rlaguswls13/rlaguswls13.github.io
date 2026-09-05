import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [, , output, ...inputs] = process.argv;
if (!output || inputs.length === 0) throw new Error('usage: node make-contact-sheet.mjs <output> <inputs...>');
const cellW = 288, cellH = 192, cols = 2;
const composites = await Promise.all(inputs.map(async (input) => ({ input: await sharp(input).resize(cellW, cellH, { fit: 'cover' }).png().toBuffer(), left: 0, top: 0 })));
const rows = Math.ceil(composites.length / cols);
const positioned = composites.map((item, i) => ({ ...item, left: (i % cols) * cellW, top: Math.floor(i / cols) * cellH }));
await fs.mkdir(path.dirname(output), { recursive: true });
await sharp({ create: { width: cols * cellW, height: rows * cellH, channels: 3, background: '#eeeeee' } }).composite(positioned).png().toFile(output);
console.log(output);
