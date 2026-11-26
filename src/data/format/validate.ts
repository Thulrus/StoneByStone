/**
 * Ajv validation of v2 files against `schema/v2/` (plan §20). Errors are turned into short
 * sentences that name the file, the record, and the field.
 */
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import cemetery from '../../../schema/v2/cemetery.json';
import common from '../../../schema/v2/common.json';
import contributor from '../../../schema/v2/contributor.json';
import document from '../../../schema/v2/document.json';
import feature from '../../../schema/v2/feature.json';
import history from '../../../schema/v2/history.json';
import manifest from '../../../schema/v2/manifest.json';
import monument from '../../../schema/v2/monument.json';
import overlay from '../../../schema/v2/overlay.json';
import person from '../../../schema/v2/person.json';
import photo from '../../../schema/v2/photo.json';
import row from '../../../schema/v2/row.json';
import section from '../../../schema/v2/section.json';
import tag from '../../../schema/v2/tag.json';

/** Every schema file, keyed by file name (also embedded in `.sbs` archives). */
export const SCHEMAS = {
  'common.json': common,
  'manifest.json': manifest,
  'document.json': document,
  'cemetery.json': cemetery,
  'section.json': section,
  'row.json': row,
  'monument.json': monument,
  'person.json': person,
  'photo.json': photo,
  'feature.json': feature,
  'overlay.json': overlay,
  'tag.json': tag,
  'contributor.json': contributor,
  'history.json': history,
} as const;

/** `data/<name>.json` collection -> schema of one item. */
export const COLLECTIONS = {
  sections: 'section.json',
  rows: 'row.json',
  monuments: 'monument.json',
  persons: 'person.json',
  photos: 'photo.json',
  features: 'feature.json',
  overlays: 'overlay.json',
  tags: 'tag.json',
  contributors: 'contributor.json',
  history: 'history.json',
} as const;

export type CollectionName = keyof typeof COLLECTIONS;
export type SchemaName = keyof typeof SCHEMAS;

export class FormatError extends Error {
  constructor(readonly problems: string[]) {
    const shown = problems.slice(0, 10);
    const more =
      problems.length > shown.length ? `\n…and ${problems.length - shown.length} more` : '';
    super(`This file isn't a valid StoneByStone file:\n${shown.join('\n')}${more}`);
    this.name = 'FormatError';
  }
}

let ajv: Ajv | undefined;
const compiled = new Map<SchemaName, ValidateFunction>();

function validator(name: SchemaName): ValidateFunction {
  let v = compiled.get(name);
  if (!v) {
    if (!ajv) {
      ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
      addFormats(ajv, ['date-time']);
      for (const s of Object.values(SCHEMAS)) ajv.addSchema(s);
    }
    v = ajv.getSchema(SCHEMAS[name].$id) as ValidateFunction;
    compiled.set(name, v);
  }
  return v;
}

function describe(e: ErrorObject): string {
  const at = e.instancePath ? e.instancePath.slice(1).replaceAll('/', '.') : '';
  const where = at ? `"${at}"` : 'the record';
  switch (e.keyword) {
    case 'required':
      return `missing "${at ? `${at}.` : ''}${String(e.params.missingProperty)}"`;
    case 'enum':
      return `${where} must be one of ${(e.params.allowedValues as unknown[]).map((v) => JSON.stringify(v)).join(', ')}`;
    case 'const':
      return `${where} must be ${JSON.stringify(e.params.allowedValue)}`;
    case 'pattern':
      return `${where} is not in the expected form`;
    default:
      return `${where} ${e.message ?? 'is invalid'}`;
  }
}

/** Problems with one value, as readable sentences prefixed by `label`. */
export function problems(name: SchemaName, value: unknown, label: string): string[] {
  const v = validator(name);
  if (v(value)) return [];
  // allOf branches repeat errors; keep one of each.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of v.errors ?? []) {
    const msg = `${label}: ${describe(e)}`;
    if (seen.has(msg)) continue;
    seen.add(msg);
    out.push(msg);
  }
  return out;
}

/** Problems with a `data/<collection>.json` array. */
export function collectionProblems(collection: CollectionName, items: unknown): string[] {
  const file = `data/${collection}.json`;
  if (!Array.isArray(items)) return [`${file}: must be a list`];
  return items.flatMap((item, i) => {
    const id = (item as { id?: unknown } | null)?.id;
    return problems(
      COLLECTIONS[collection],
      item,
      `${file} item ${i + 1}${typeof id === 'string' ? ` (${id})` : ''}`,
    );
  });
}

export function assertValid(found: string[]): void {
  if (found.length > 0) throw new FormatError(found);
}
