import { describe, expect, it } from 'vitest';
import { amountParts, formatCompact } from './format';
import { pnlTint, MAX_ALPHA, MIN_ALPHA, RGB, blend, contrast } from './colorScale';

describe('formatCompact', () => {
  it.each([
    [1234, '+1,2K'],
    [-350, '−350'],
    [12_500, '+13K'],
    [999_999, '+999K'],
    [1_300_000, '+1,3M'],
    [0, '0'],
    [5.25, '+5,3'],
    [9_960, '+10K'],
    [-45.4, '−45'],
  ])('%d → %s', (v, out) => expect(formatCompact(v)).toBe(out));
  it('never longer than 6 chars', () => {
    for (let v = 0.01; v < 2e12; v *= 1.37) {
      expect(formatCompact(v).length).toBeLessThanOrEqual(6);
      expect(formatCompact(-v).length).toBeLessThanOrEqual(6);
    }
  });
});

describe('amountParts', () => {
  it.each([
    [113.23, 'narrow', '+113', ',23'],
    [-96.36, 'narrow', '−96', ',36'],
    [0.4, 'narrow', '+0', ',40'],
    [999.995, 'narrow', '+1.000', ''],
    [1234.56, 'narrow', '+1.235', ''],
    [12_345.6, 'narrow', '+12K', ''],
    [1234.56, 'wide', '+1.234', ',56'],
    [-0.004, 'wide', '0', ',00'],
    [2_500_000, 'wide', '+2,5M', ''],
  ] as const)('%d %s → %s%s', (v, mode, main, frac) => expect(amountParts(v, mode)).toEqual({ main, frac }));
  it('currency symbol goes after the sign', () => expect(amountParts(549.53, 'wide', '$')).toEqual({ main: '+$549', frac: ',53' }));
});

describe('pnlTint', () => {
  it('green/red/neutral/none', () => {
    expect(pnlTint(10, 100).tone).toBe('profit');
    expect(pnlTint(-10, 100).tone).toBe('loss');
    expect(pnlTint(0, 100).tone).toBe('flat');
    expect(pnlTint(0, 100, false).tone).toBe('none');
  });
  it('sqrt scale clamped to [min,max]', () => {
    expect(pnlTint(100, 100).alpha).toBe(MAX_ALPHA);
    expect(pnlTint(1e-9, 100).alpha).toBeCloseTo(MIN_ALPHA, 2);
    expect(pnlTint(25, 100).intensity).toBeCloseTo(0.5);
    expect(pnlTint(500, 100).alpha).toBe(MAX_ALPHA); // never above max
  });
  it('white text stays WCAG AA on the strongest tint', () => {
    for (const c of [RGB.profit, RGB.loss, RGB.flat]) {
      for (const bg of [RGB.bg, RGB.surface]) {
        expect(contrast([255, 255, 255], blend(c, bg, MAX_ALPHA))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
