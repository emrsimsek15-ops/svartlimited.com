import { tr, type Strings } from './tr';

const dictionaries: Record<string, Strings> = { tr };
export const strings: Strings = dictionaries.tr!;

/** Interpolate `{name}` placeholders. */
export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}

export function useT(): Strings {
  return strings;
}

export function errorText(code: string | undefined): string {
  const e = strings.errors as Record<string, string>;
  return (code && e[code]) || code || e.UNKNOWN!;
}
