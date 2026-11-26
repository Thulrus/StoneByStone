/**
 * One entry point for importing a file (plan §20.3, §22.2): detects `.sbs` (zip),
 * `.sbs.json`, or a v1 `.cem.json` by content, not by file name.
 */
import type { ImportSummary } from './format/import';
import { importArchive } from './format/import';
import { readSbsJson } from './format/parse';
import { readSbs } from './format/sbs';
import { FormatError } from './format/validate';
import type { Store } from './store';
import { importV1 } from './v1/import';
import { isV1File } from './v1/types';

export type FileKind = 'sbs' | 'sbs.json' | 'v1';

export async function detectFileKind(file: Blob): Promise<FileKind | undefined> {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) return 'sbs';
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return undefined;
  }
  if (isV1File(json)) return 'v1';
  const manifest = (json as { manifest?: { format?: unknown } } | null)?.manifest;
  return manifest?.format === 'stonebystone' ? 'sbs.json' : undefined;
}

export async function importFile(
  store: Store,
  file: Blob,
): Promise<ImportSummary & { kind: FileKind }> {
  const kind = await detectFileKind(file);
  switch (kind) {
    case 'sbs': {
      const { archive, binaries } = await readSbs(file);
      return { kind, ...(await importArchive(store, archive, binaries)) };
    }
    case 'sbs.json':
      return { kind, ...(await importArchive(store, readSbsJson(await file.text()))) };
    case 'v1':
      return { kind, ...(await importV1(store, JSON.parse(await file.text()))) };
    default:
      throw new FormatError([
        'this file is not a StoneByStone archive (.sbs, .sbs.json) or a v1 .cem.json file',
      ]);
  }
}
