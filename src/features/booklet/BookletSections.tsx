import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { useStore } from '../../app/store-context';
import { flatName, type FlatStone } from '../../data/format/flat';
import { formatDate, type ID, type Person } from '../../domain';
import { BlobImage } from '../capture/PhotoStrip';
import { indexLetter, type IndexEntry, type RowGroup } from './booklet';

/** "Section A, Row 3, stone 2" in the user's language. */
function useWhere() {
  const { t } = useLingui();
  return (f: FlatStone | undefined) => {
    if (!f) return t`No stone found`;
    const parts: string[] = [];
    if (f.section) parts.push(t`Section ${f.section}`);
    if (f.row) parts.push(t`Row ${f.row}`);
    const n = f.position;
    if (n !== undefined) parts.push(t`stone ${n}`);
    const plot = f.stone.address?.plotLabel;
    if (plot) parts.push(t`plot ${plot}`);
    return parts.join(', ') || t`Not in a row`;
  };
}

const dateOf = (p: Person, k: 'birth' | 'death') => {
  const d = k === 'death' ? (p.death ?? p.burial) : p.birth;
  return d ? formatDate(d) : '';
};

/** People A–Z with dates and where they lie. */
export function NameIndex({ entries }: { entries: IndexEntry[] }) {
  const { t } = useLingui();
  const where = useWhere();
  const letters: [string, IndexEntry[]][] = [];
  for (const e of entries) {
    const l = indexLetter(e.person);
    const last = letters.at(-1);
    if (last?.[0] === l) last[1].push(e);
    else letters.push([l, [e]]);
  }
  return (
    <div className="columns-1 gap-8 text-sm print:columns-2">
      {letters.map(([letter, list]) => (
        <section key={letter} aria-label={letter} className="mb-3">
          <h3 className="mb-1 font-bold break-after-avoid">{letter}</h3>
          <ul className="flex flex-col">
            {list.map(({ person: p, stone }) => {
              const born = dateOf(p, 'birth');
              const died = dateOf(p, 'death');
              return (
                <li key={p.id} className="break-inside-avoid border-b border-border py-0.5">
                  <span className="font-medium">
                    {[p.name.surname, [p.name.given, p.name.middle].filter(Boolean).join(' ')]
                      .filter(Boolean)
                      .join(', ') ||
                      flatName(p) ||
                      t`(no name)`}
                  </span>
                  {born || died ? (
                    <span className="text-fg-muted">
                      {' '}
                      {born || '?'} – {died || '?'}
                    </span>
                  ) : null}
                  <span className="text-fg-muted"> · {where(stone)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Thumb({ photoId }: { photoId: ID }) {
  const store = useStore();
  const [blob, setBlob] = useState<Blob>();
  useEffect(() => {
    let live = true;
    void store.photos.thumb(photoId).then((b) => live && setBlob(b));
    return () => {
      live = false;
    };
  }, [store, photoId]);
  return blob ? (
    <BlobImage blob={blob} alt="" className="size-24 shrink-0 rounded object-cover" />
  ) : (
    <span className="size-24 shrink-0 rounded bg-surface-2" />
  );
}

/** Stones row by row in walking order, with their people, inscription and a photo. */
export function RowListings({
  groups,
  covers,
  photos,
}: {
  groups: RowGroup[];
  covers: ReadonlyMap<ID, ID>;
  photos: boolean;
}) {
  const { t } = useLingui();
  // The row is in the heading, so each stone needs only its place in it.
  const stoneLabel = (f: FlatStone) => {
    const n = f.position;
    const plot = f.stone.address?.plotLabel;
    return (
      [n !== undefined ? t`Stone ${n}` : '', plot ? t`plot ${plot}` : '']
        .filter(Boolean)
        .join(', ') || t`Stone`
    );
  };
  return (
    <>
      {groups.map((g) => {
        const heading =
          [g.section ? t`Section ${g.section}` : '', g.row ? t`Row ${g.row}` : '']
            .filter(Boolean)
            .join(', ') || t`Stones in no row`;
        return (
          <section key={`${g.section ?? ''}|${g.row ?? ''}`} className="mb-6">
            <h3 className="mb-2 text-lg font-semibold break-after-avoid">{heading}</h3>
            <ol className="flex flex-col gap-x-8 print:block print:columns-2">
              {g.stones.map((f) => {
                const cover = covers.get(f.stone.id);
                return (
                  <li
                    key={f.stone.id}
                    className="flex gap-3 border-b border-border py-2 break-inside-avoid"
                  >
                    {photos && cover ? <Thumb photoId={cover} /> : null}
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm text-fg-muted">{stoneLabel(f)}</span>
                      {f.people.map((p) => {
                        const born = dateOf(p, 'birth');
                        const died = dateOf(p, 'death');
                        return (
                          <span key={p.id} className="font-medium">
                            {flatName(p) || t`(no name)`}
                            {born || died ? (
                              <span className="font-normal">
                                {' '}
                                ({born || '?'} – {died || '?'})
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                      {f.stone.inscription?.text ? (
                        <p className="text-sm whitespace-pre-line">{f.stone.inscription.text}</p>
                      ) : f.people.length === 0 ? (
                        <p className="text-sm text-fg-muted">
                          <Trans>Not transcribed</Trans>
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </>
  );
}
