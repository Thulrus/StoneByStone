/**
 * Row and section labels (plan §7.2): numeric ("4", "04"), alphabetic ("D", "AA"), either with
 * a prefix ("Row 4", "R-D"), or free text. These helpers continue a series; free text has no
 * successor.
 */

function nextLetters(s: string): string {
  const base = s === s.toUpperCase() ? 65 : 97;
  const digits = [...s].map((c) => c.charCodeAt(0) - base);
  let i = digits.length - 1;
  while (i >= 0 && digits[i] === 25) digits[i--] = 0;
  if (i < 0) digits.unshift(0);
  else digits[i] = (digits[i] ?? 0) + 1;
  return String.fromCharCode(...digits.map((d) => d + base));
}

/** The label after `prev`, or `undefined` when `prev` is free text. Empty → "1". */
export function nextLabel(prev: string): string | undefined {
  const s = prev.trim();
  if (s === '') return '1';
  const num = /^(.*?)(\d+)$/.exec(s);
  if (num) {
    const [, prefix = '', digits = ''] = num;
    return prefix + String(Number(digits) + 1).padStart(digits.length, '0');
  }
  // One or two letters at the end, after a non-letter: "D", "Row C", "AZ". Not "plot".
  const alpha = /^(.*?[^A-Za-z])?([A-Z]{1,2}|[a-z]{1,2})$/.exec(s);
  if (alpha) return (alpha[1] ?? '') + nextLetters(alpha[2] ?? '');
  return undefined;
}

/** `count` labels starting at `first`, stopping early if the series can't continue. */
export function labelSeries(first: string, count: number): string[] {
  const out: string[] = [];
  let cur: string | undefined = first.trim();
  while (out.length < count && cur !== undefined && cur !== '') {
    out.push(cur);
    cur = nextLabel(cur);
  }
  return out;
}

/** Sort key that orders "Row 2" before "Row 10". */
export function compareLabels(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
