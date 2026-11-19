/**
 * The single P&L color scale used everywhere (calendar, heatmap, bars).
 * Intensity = sqrt(|value| / reference), mapped into [MIN_ALPHA, MAX_ALPHA] so one huge day does not
 * wash out the rest and text on top stays readable. MAX_ALPHA is chosen so white text on the most
 * intense tint over the app background keeps a contrast ratio ≥ 4.5:1 (WCAG AA) — see the unit test.
 */
export const MIN_ALPHA = 0.14;
export const MAX_ALPHA = 0.6;

export type Tone = 'profit' | 'loss' | 'flat' | 'none';

export interface Tint {
  tone: Tone;
  alpha: number;
  intensity: number; // 0..1
}

export function pnlTint(value: number, reference: number, hasTrades = true): Tint {
  if (!hasTrades) return { tone: 'none', alpha: 0, intensity: 0 };
  if (value === 0) return { tone: 'flat', alpha: MIN_ALPHA, intensity: 0 };
  const ref = Math.max(Math.abs(reference), Math.abs(value));
  const intensity = Math.sqrt(Math.abs(value) / ref);
  const alpha = MIN_ALPHA + (MAX_ALPHA - MIN_ALPHA) * intensity;
  return { tone: value > 0 ? 'profit' : 'loss', alpha: Math.round(alpha * 1000) / 1000, intensity };
}

/** RGB triplets (also defined as CSS variables in index.css — keep in sync). */
export const RGB = {
  bg: [10, 11, 15],
  surface: [17, 19, 25],
  profit: [34, 197, 134],
  loss: [244, 82, 99],
  flat: [138, 146, 166],
} as const;

export function tintBackground(t: Tint): string {
  if (t.tone === 'none') return 'transparent';
  const c = RGB[t.tone];
  return `rgb(${c[0]} ${c[1]} ${c[2]} / ${t.alpha})`;
}

// ---- contrast helpers (used by tests) ---------------------------------------
const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export const luminance = ([r, g, b]: readonly number[]) => 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
export function contrast(a: readonly number[], b: readonly number[]) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}
export function blend(fg: readonly number[], bg: readonly number[], alpha: number): number[] {
  return fg.map((c, i) => Math.round(c * alpha + bg[i]! * (1 - alpha)));
}
