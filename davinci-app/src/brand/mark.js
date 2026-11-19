// Da Vinci brand mark — the single source for the in-app logo and the generated PWA icons.
// Concept: Vitruvian circle + square (construction lines) with four rising candles whose body
// heights are Fibonacci numbers (5, 3, 8, 13) and a dashed golden 0.618 level.
// Coordinates are on a 64×64 grid.

const W = 5.4;
const G = 3.2;
const X0 = 32 - (4 * W + 3 * G) / 2;
// [bodyTop, bodyBottom, wickTop, wickBottom, kind]
const CANDLES = [
  [40, 45, 37.5, 47.5, 'bull'],
  [39, 42, 37, 44, 'bear'],
  [30, 38, 27.5, 40.5, 'bull'],
  [17, 30, 14, 32, 'hero'],
];

/** SVG <defs> + shapes for the mark. `id` prefixes gradient ids so several marks can share a page. */
export function markSvg(id = 'dv', { lines = 0.09 } = {}) {
  const u = (n) => `${id}-${n}`;
  const candles = CANDLES.map(([bt, bb, wt, wb, k], i) => {
    const x = X0 + i * (W + G);
    const cx = (x + W / 2).toFixed(2);
    const wick = k === 'hero' ? '#7FD3F2' : k === 'bear' ? '#6A6F82' : '#B9BDCB';
    const op = k === 'bull' ? 0.7 + i * 0.1 : 1;
    const fill = k === 'hero' ? `url(#${u('acc')})` : k === 'bear' ? '#4E5263' : `url(#${u('sil')})`;
    return `<g opacity="${op}"><line x1="${cx}" y1="${wt}" x2="${cx}" y2="${wb}" stroke="${wick}" stroke-width="1" stroke-linecap="round"/><rect x="${x.toFixed(2)}" y="${bt}" width="${W}" height="${bb - bt}" rx="1.1" fill="${fill}"/></g>`;
  }).join('');
  const hx = (X0 + 3 * (W + G)).toFixed(2);
  return `<defs>
    <linearGradient id="${u('sil')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2F3F7"/><stop offset="1" stop-color="#8D92A6"/></linearGradient>
    <linearGradient id="${u('acc')}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7B6BFF"/><stop offset="1" stop-color="#5CE1E6"/></linearGradient>
    <linearGradient id="${u('ring')}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8B7CFF" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#5CE1E6" stop-opacity=".55"/></linearGradient>
    <filter id="${u('glow')}" x="-100%" y="-50%" width="300%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
  </defs>
  <rect x="14" y="17" width="36" height="36" fill="none" stroke="#fff" stroke-opacity="${lines}" stroke-width="0.7"/>
  <circle cx="32" cy="31" r="22" fill="none" stroke="url(#${u('ring')})" stroke-width="0.9"/>
  <line x1="12.5" y1="33.5" x2="51.5" y2="33.5" stroke="#8B7CFF" stroke-opacity=".45" stroke-width="0.6" stroke-dasharray="1.4 1.3"/>
  <g filter="url(#${u('glow')})" opacity=".6"><rect x="${hx}" y="17" width="${W}" height="13" rx="1.1" fill="url(#${u('acc')})"/></g>
  ${candles}`;
}

/** Dark app-icon background (radial graphite + soft top highlight). */
export function iconBackground(id = 'dv') {
  return `<defs>
    <radialGradient id="${id}-bg" cx="32%" cy="18%" r="100%"><stop offset="0" stop-color="#1D1F2C"/><stop offset=".55" stop-color="#0F1016"/><stop offset="1" stop-color="#07080B"/></radialGradient>
    <linearGradient id="${id}-hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs><rect width="64" height="64" fill="url(#${id}-bg)"/><rect width="64" height="64" fill="url(#${id}-hl)"/>`;
}

/** Full icon SVG. `rounded` clips to an iOS-like squircle; `scale` shrinks the mark (maskable safe zone). */
export function iconSvg({ rounded = false, scale = 1 } = {}) {
  const t = scale === 1 ? '' : ` transform="translate(${32 - 32 * scale} ${32 - 32 * scale}) scale(${scale})"`;
  const body = `${iconBackground('i')}<g${t}>${markSvg('i')}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${rounded ? `<clipPath id="sq"><rect width="64" height="64" rx="14.3"/></clipPath><g clip-path="url(#sq)">${body}</g>` : body}</svg>`;
}
