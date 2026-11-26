import { conventionOf } from '../../domain';
import { APP_VERSION, type Manifest } from './archive';

/** `as-carved ([illegible], [?] after an uncertain word, ...)`. */
function conventionLine(id: string | undefined): string {
  const c = conventionOf(id);
  const lines = c.lineBreak === 'slash' ? '" / " between lines' : 'line breaks as carved';
  return `${id ?? c.id} (${c.illegible} illegible, ${c.uncertain} after an uncertain word, ${c.broken}, ${c.onBack}, ${lines})`;
}

/** README.txt placed in every `.sbs` archive. */
export function readmeText(
  m: Manifest,
  cemeteryName: string,
  license?: string,
  convention?: string,
): string {
  return `StoneByStone archive
====================

Cemetery:  ${cemeteryName}
Kind:      ${m.kind}
Created:   ${m.createdAt} by ${m.createdBy.displayName || 'an unnamed contributor'}
App:       StoneByStone ${APP_VERSION}, format version ${m.formatVersion}
License:   ${license ?? 'not stated'}
Transcription convention: ${conventionLine(convention)}

This is an ordinary zip file. Everything in it is open and documented, so the data stays
usable without the app.

  manifest.json         what is in the archive and who made it
  cemetery.json         the cemetery record
  data/*.json           sections, rows, monuments, persons, photos (metadata), features,
                        overlays, tags, contributors, history
  photos/<id>.jpg       full-size photos (Photo.id)
  thumbs/<id>.jpg       thumbnails
  overlays/<id>.jpg     plat maps and other overlay images (Overlay.imageId)
  schema/*.json         JSON Schemas (draft-07) describing every file above

Every record has an "id" (a UUID) and "stamps": for each field, when it was last written
(a hybrid logical clock, "<millis>-<counter>-<device>") and by whom (a contributor id).
Records are never removed; deleted ones carry a "deleted" stamp.

The full format description is docs/FORMAT.md in the StoneByStone repository:
https://github.com/Thulrus/StoneByStone
`;
}
