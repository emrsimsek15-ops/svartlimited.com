/** Integer-unit money helpers. All P&L sums happen on integers; division happens once, at display. */
export const pow10 = (d: number) => 10 ** d;

/** Rescale an integer amount from `from` digits to `to` digits (to >= from keeps it exact). */
export function rescale(units: number, from: number, to: number): number {
  if (from === to) return units;
  if (to > from) return units * pow10(to - from);
  return Math.round(units / pow10(from - to));
}

export function fromUnits(units: number, digits: number): number {
  return units / pow10(digits);
}

export function toUnits(value: number, digits: number): number {
  return Math.round(value * pow10(digits));
}
