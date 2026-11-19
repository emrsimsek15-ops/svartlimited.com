// Generates the favicon and PWA icons from src/brand/mark.js. Run: npm run icons
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import { iconSvg } from '../src/brand/mark.js';

mkdirSync('public', { recursive: true });
writeFileSync('public/favicon.svg', iconSvg({ rounded: true }));
const png = (file, size, svg) => sharp(Buffer.from(svg), { density: Math.ceil((size / 64) * 72 * 1.5) }).resize(size, size).png().toFile(`public/${file}`);
await png('icon-192.png', 192, iconSvg({ rounded: true }));
await png('icon-512.png', 512, iconSvg({ rounded: true }));
await png('icon-maskable-512.png', 512, iconSvg({ scale: 0.8 })); // full-bleed, mark inside the 80% safe zone
await png('apple-touch-icon.png', 180, iconSvg()); // iOS rounds the corners itself
console.log('icons written');
