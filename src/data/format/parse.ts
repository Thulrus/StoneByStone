/** Turn decoded JSON into a validated `Archive`, with readable errors (plan §20). */
import { FORMAT, FORMAT_VERSION, COLLECTION_NAMES, type Archive } from './archive';
import { assertValid, collectionProblems, FormatError, problems } from './validate';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Checks the manifest first so a wrong or newer format gets a specific message. */
export function checkManifest(manifest: unknown): void {
  if (!isObject(manifest) || manifest.format !== FORMAT) {
    throw new FormatError(['manifest.json: this is not a StoneByStone archive']);
  }
  const v = manifest.formatVersion;
  if (typeof v === 'number' && v > FORMAT_VERSION) {
    throw new FormatError([
      `manifest.json: made by a newer version of StoneByStone (format ${v}); update the app to open it`,
    ]);
  }
  assertValid(problems('manifest.json', manifest, 'manifest.json'));
}

export function parseArchive(parts: {
  manifest: unknown;
  cemetery: unknown;
  data: Record<string, unknown>;
}): Archive {
  checkManifest(parts.manifest);
  const found = problems('cemetery.json', parts.cemetery, 'cemetery.json');
  for (const k of COLLECTION_NAMES) {
    found.push(...collectionProblems(k, parts.data[k] ?? []));
  }
  assertValid(found);
  const archive = {
    manifest: parts.manifest,
    cemetery: parts.cemetery,
    data: Object.fromEntries(COLLECTION_NAMES.map((k) => [k, parts.data[k] ?? []])),
  } as unknown as Archive;
  const cemeteryId = archive.cemetery.id;
  if (archive.manifest.cemeteryId !== cemeteryId) {
    throw new FormatError(['manifest.json: "cemeteryId" does not match cemetery.json']);
  }
  const stray: string[] = [];
  for (const k of COLLECTION_NAMES) {
    if (k === 'contributors') continue;
    for (const r of archive.data[k] as { id: string; cemeteryId: string }[]) {
      if (r.cemeteryId !== cemeteryId)
        stray.push(`data/${k}.json (${r.id}): belongs to another cemetery`);
    }
  }
  assertValid(stray);
  return archive;
}

/** `.sbs.json`: the archive as one JSON document. */
export function readSbsJson(text: string): Archive {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new FormatError(['the file is not valid JSON']);
  }
  if (!isObject(doc)) throw new FormatError(['the file is not a StoneByStone document']);
  return parseArchive({
    manifest: doc.manifest,
    cemetery: doc.cemetery,
    data: isObject(doc.data) ? doc.data : {},
  });
}
