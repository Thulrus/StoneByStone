/** Phonetic codes for name search (plan §10.2): American Soundex and Daitch–Mokotoff. */

const SPECIAL: Record<string, string> = {
  ß: 'SS',
  Æ: 'AE',
  Œ: 'OE',
  Ø: 'O',
  Ł: 'L',
  Đ: 'D',
  Þ: 'TH',
};

/** Uppercase A–Z only: strip diacritics and everything that is not a letter. */
export function foldToAscii(s: string): string {
  return s
    .toUpperCase()
    .replace(/[ßÆŒØŁĐÞ]/g, (c) => SPECIAL[c] ?? c)
    .normalize('NFD')
    .replace(/[^A-Z]/g, '');
}

const SOUNDEX_GROUPS = ['BFPV', 'CGJKQSXZ', 'DT', 'L', 'MN', 'R'];
const SOUNDEX: Record<string, string> = Object.fromEntries(
  SOUNDEX_GROUPS.flatMap((letters, i) => [...letters].map((c) => [c, String(i + 1)])),
);

/** American Soundex (H and W do not separate equal codes; vowels do). '' for empty input. */
export function soundex(name: string): string {
  const s = foldToAscii(name);
  const first = s[0];
  if (!first) return '';
  let out = first;
  let last = SOUNDEX[first] ?? '';
  for (const ch of s.slice(1)) {
    const code = SOUNDEX[ch];
    if (code) {
      if (code !== last) out += code;
      last = code;
    } else if (ch !== 'H' && ch !== 'W') {
      last = '';
    }
    if (out.length === 4) break;
  }
  return out.padEnd(4, '0');
}

/**
 * Daitch–Mokotoff rules: "letters start beforeVowel other". `|` separates alternative codes
 * (each becomes a branch); `-` means not coded. Longest match wins, so longer rules come
 * first. Source: the standard JewishGen chart.
 */
const DM_TABLE = `
SCHTSCH 2 4 4|SCHTSH 2 4 4|SCHTCH 2 4 4|SHTCH 2 4 4|SHTSH 2 4 4|STSCH 2 4 4|TTSCH 4 4 4
ZHDZH 2 4 4|SHCH 2 4 4|SCHT 2 43 43|SCHD 2 43 43|STCH 2 4 4|STRZ 2 4 4|STRS 2 4 4
STSH 2 4 4|SZCZ 2 4 4|SZCS 2 4 4|TTCH 4 4 4|TSCH 4 4 4|TTSZ 4 4 4|ZDZH 2 4 4|ZSCH 4 4 4
CHS 5 54 54|CSZ 4 4 4|CZS 4 4 4|DRZ 4 4 4|DRS 4 4 4|DSH 4 4 4|DSZ 4 4 4|DZH 4 4 4
DZS 4 4 4|SCH 4 4 4|SHT 2 43 43|SZT 2 43 43|SHD 2 43 43|SZD 2 43 43|TCH 4 4 4|TRZ 4 4 4
TRS 4 4 4|TSH 4 4 4|TTS 4 4 4|TTZ 4 4 4|TZS 4 4 4|TSZ 4 4 4|ZDZ 2 4 4|ZHD 2 43 43
ZSH 4 4 4|AI 0 1 -|AJ 0 1 -|AY 0 1 -|AU 0 7 -|CH 5/4 5/4 5/4|CK 5/45 5/45 5/45|CZ 4 4 4
CS 4 4 4|DS 4 4 4|DZ 4 4 4|DT 3 3 3|EI 0 1 -|EJ 0 1 -|EY 0 1 -|EU 1 1 -|FB 7 7 7
IA 1 - -|IE 1 - -|IO 1 - -|IU 1 - -|KS 5 54 54|KH 5 5 5|MN 66 66 66|NM 66 66 66
OI 0 1 -|OJ 0 1 -|OY 0 1 -|PF 7 7 7|PH 7 7 7|RZ 94/4 94/4 94/4|RS 94/4 94/4 94/4
SH 4 4 4|SC 2 4 4|ST 2 43 43|SZ 4 4 4|SD 2 43 43|TH 3 3 3|TS 4 4 4|TC 4 4 4|TZ 4 4 4
UI 0 1 -|UJ 0 1 -|UY 0 1 -|ZH 4 4 4|ZS 4 4 4|ZD 2 43 43
A 0 - -|B 7 7 7|C 5/4 5/4 5/4|D 3 3 3|E 0 - -|F 7 7 7|G 5 5 5|H 5 5 -|I 0 - -|J 1/4 1/4 1/4
K 5 5 5|L 8 8 8|M 6 6 6|N 6 6 6|O 0 - -|P 7 7 7|Q 5 5 5|R 9 9 9|S 4 4 4|T 3 3 3|U 0 - -
V 7 7 7|W 7 7 7|X 5 54 54|Y 1 - -|Z 4 4 4`;

interface DmRule {
  letters: string;
  cells: [string[], string[], string[]];
}

const DM_RULES: DmRule[] = DM_TABLE.split(/[|\n]/)
  .map((r) => r.trim())
  .filter(Boolean)
  .map((r): DmRule => {
    const [letters = '', ...cells] = r.split(' ');
    const alts = (c: string | undefined) => (c === '-' || c === undefined ? [''] : c.split('/'));
    return { letters, cells: [alts(cells[0]), alts(cells[1]), alts(cells[2])] };
  })
  .sort((a, b) => b.letters.length - a.letters.length);

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

/** Daitch–Mokotoff Soundex: one or more 6-digit codes (branches), sorted and unique. */
export function daitchMokotoff(name: string): string[] {
  const s = foldToAscii(name);
  if (!s) return [];
  let branches: { code: string; last: string }[] = [{ code: '', last: '' }];
  let i = 0;
  while (i < s.length) {
    const rule = DM_RULES.find((r) => s.startsWith(r.letters, i));
    if (!rule) {
      i++;
      continue;
    }
    const next = s[i + rule.letters.length];
    const alts = i === 0 ? rule.cells[0] : next && VOWELS.has(next) ? rule.cells[1] : rule.cells[2];
    branches = branches.flatMap((b) =>
      alts.map((alt) => ({ code: alt !== b.last ? b.code + alt : b.code, last: alt })),
    );
    i += rule.letters.length;
  }
  return [...new Set(branches.map((b) => b.code.slice(0, 6).padEnd(6, '0')))].sort();
}
