/**
 * CSV reading and writing (RFC 4180, plan §20.3). Reading is forgiving, as spreadsheets and
 * old society databases export it: a byte-order mark, `;` or tab delimiters (detected), CR,
 * LF or CRLF line ends, quoted fields with doubled quotes and line breaks, ragged rows.
 */

export type Delimiter = ',' | ';' | '\t';

/** The delimiter that splits the first lines most consistently (outside quotes). */
export function detectDelimiter(text: string): Delimiter {
  const sample = text.slice(0, 20_000);
  let best: Delimiter = ',';
  let bestScore = -1;
  for (const d of [',', ';', '\t'] as const) {
    const counts = splitRows(sample, d)
      .slice(0, 20)
      .filter((r) => r.length > 1 || (r[0] ?? '') !== '')
      .map((r) => r.length);
    if (counts.length === 0) continue;
    const first = counts[0] ?? 1;
    if (first < 2) continue;
    // Lines that agree with the first line's width, weighted by the width.
    const score = counts.filter((c) => c === first).length * first;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"' && field === '') {
      quoted = true;
      i++;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
      i++;
    } else if (c === '\r' || c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += c === '\r' && text[i + 1] === '\n' ? 2 : 1;
    } else {
      field += c;
      i++;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Rows of fields. Blank lines are dropped; fields are not trimmed. */
export function parseCsv(text: string, delimiter?: Delimiter): string[][] {
  const t = text.startsWith('﻿') ? text.slice(1) : text;
  return splitRows(t, delimiter ?? detectDelimiter(t)).filter((r) =>
    r.some((f) => f.trim() !== ''),
  );
}

/** One CSV field, quoted when it needs to be. */
export function csvField(v: string | number | undefined): string {
  const s = v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function csvLine(fields: readonly (string | number | undefined)[]): string {
  return fields.map(csvField).join(',');
}
