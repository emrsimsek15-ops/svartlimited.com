// Generates PWA icons from the Da Vinci mark. Run: npm run icons
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const mark = (scale = 1) => {
  const s = 64 * scale;
  const o = (64 - s) / 2;
  return `<g transform="translate(${o} ${o}) scale(${scale})">
    <rect x="10" y="10" width="44" height="44" rx="3" fill="none" stroke="#8B7CFF" stroke-width="2.5"/>
    <circle cx="32" cy="32" r="24" fill="none" stroke="#ECEEF3" stroke-opacity="0.9" stroke-width="2.5"/>
    <path d="M18 42 L28 32 L35 37 L46 23" fill="none" stroke="#8B7CFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
};
const svg = (scale, bg = true, radius = 14) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${bg ? `<defs><radialGradient id="g" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="#1A1C27"/><stop offset="1" stop-color="#0A0B0F"/></radialGradient></defs><rect width="64" height="64" rx="${radius}" fill="url(#g)"/>` : ''}
  ${mark(scale)}
</svg>`;

mkdirSync('public', { recursive: true });
writeFileSync('public/favicon.svg', svg(0.92, true, 14));
const out = async (file, size, s) => sharp(Buffer.from(s), { density: 1200 }).resize(size, size).png().toFile(`public/${file}`);
await out('icon-192.png', 192, svg(0.82, true, 0));
await out('icon-512.png', 512, svg(0.82, true, 0));
await out('icon-maskable-512.png', 512, svg(0.62, true, 0)); // safe zone: inner 80%
await out('apple-touch-icon.png', 180, svg(0.78, true, 0));
console.log('icons written');
