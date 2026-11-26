/**
 * `.sbs` (zip) and `.sbs.json` encodings (plan §20.1, §20.2). Zips are written and read in
 * chunks with fflate, so a large archive is never held as one buffer. Photos are stored
 * uncompressed (JPEG doesn't compress); JSON is deflated.
 */
import { Unzip, UnzipInflate, Zip, ZipDeflate, ZipPassThrough } from 'fflate';
import type { Archive, Binaries } from './archive';
import { COLLECTION_NAMES, emptyBinaries } from './archive';
import { prettyJson } from './export';
import { parseArchive } from './parse';
import { readmeText } from './readme';
import { FormatError, SCHEMAS } from './validate';

const CHUNK = 1 << 20;
const enc = new TextEncoder();

async function* chunks(blob: Blob): AsyncGenerator<Uint8Array> {
  for (let off = 0; off < blob.size; off += CHUNK) {
    yield new Uint8Array(await blob.slice(off, off + CHUNK).arrayBuffer());
  }
}

export async function writeSbs(archive: Archive, binaries: Binaries): Promise<Blob> {
  const parts: Uint8Array[] = [];
  let failed: Error | undefined;
  let finish: (b: Blob) => void = () => {};
  const done = new Promise<Blob>((resolve) => (finish = resolve));
  const writer = new Zip((err, chunk, final) => {
    if (err) {
      failed ??= err;
      return;
    }
    parts.push(chunk);
    if (final) finish(new Blob(parts as BlobPart[], { type: 'application/zip' }));
  });

  const text = (name: string, body: string) => {
    const f = new ZipDeflate(name, { level: 6 });
    writer.add(f);
    f.push(enc.encode(body), true);
  };
  const binary = async (name: string, blob: Blob) => {
    const f = new ZipPassThrough(name);
    writer.add(f);
    for await (const c of chunks(blob)) f.push(c);
    f.push(new Uint8Array(0), true);
  };

  text('manifest.json', prettyJson(archive.manifest));
  text('cemetery.json', prettyJson(archive.cemetery));
  for (const k of COLLECTION_NAMES) text(`data/${k}.json`, prettyJson(archive.data[k]));
  for (const [id, b] of binaries.photos) await binary(`photos/${id}.jpg`, b);
  for (const [id, b] of binaries.thumbs) await binary(`thumbs/${id}.jpg`, b);
  for (const [id, b] of binaries.overlays) await binary(`overlays/${id}.jpg`, b);
  for (const [name, s] of Object.entries(SCHEMAS)) text(`schema/${name}`, prettyJson(s));
  text(
    'README.txt',
    readmeText(
      archive.manifest,
      archive.cemetery.name,
      archive.cemetery.license,
      archive.cemetery.settings.transcriptionConvention,
    ),
  );
  writer.end();
  if (failed) throw failed;
  return done;
}

export async function readSbs(file: Blob): Promise<{ archive: Archive; binaries: Binaries }> {
  const files = new Map<string, Uint8Array[]>();
  let error: Error | undefined;
  const unzip = new Unzip((entry) => {
    const got: Uint8Array[] = [];
    entry.ondata = (err, data, final) => {
      if (err) error ??= err;
      got.push(data);
      if (final) files.set(entry.name, got);
    };
    entry.start();
  });
  unzip.register(UnzipInflate);
  try {
    for await (const c of chunks(file)) unzip.push(c);
    unzip.push(new Uint8Array(0), true);
  } catch (e) {
    error ??= e as Error;
  }
  if (error || !files.has('manifest.json')) {
    throw new FormatError(['the file is not a StoneByStone archive (no readable manifest.json)']);
  }

  const dec = new TextDecoder();
  const json = (name: string): unknown => {
    const body = files.get(name);
    if (!body) return undefined;
    try {
      return JSON.parse(dec.decode(concat(body)));
    } catch {
      throw new FormatError([`${name}: not valid JSON`]);
    }
  };
  const archive = parseArchive({
    manifest: json('manifest.json'),
    cemetery: json('cemetery.json'),
    data: Object.fromEntries(COLLECTION_NAMES.map((k) => [k, json(`data/${k}.json`)])),
  });

  const binaries = emptyBinaries();
  for (const [name, body] of files) {
    const m = /^(photos|thumbs|overlays)\/([^/]+)\.jpg$/.exec(name);
    if (!m?.[1] || !m[2]) continue;
    const kind = m[1] as keyof Binaries;
    binaries[kind].set(m[2], new Blob(body as BlobPart[], { type: 'image/jpeg' }));
  }
  return { archive, binaries };
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) out.set(p, (off += p.length) - p.length);
  return out;
}

/** `.sbs.json`: one JSON document, no binaries. */
export function writeSbsJson(archive: Archive): string {
  return prettyJson(archive);
}
