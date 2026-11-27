import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { exportPath } from '../../app/paths';
import {
  conventionOf,
  formatDate,
  type Cemetery,
  type Contributor,
  type ID,
  type Monument,
  type Person,
} from '../../domain';
import { Button } from '../../ui/Button';
import type { Layout } from '../cemeteries/useLayout';
import { ConventionReference } from '../transcribe/ConventionsDialog';
import { buildBooklet, planMap } from './booklet';
import { NameIndex, RowListings } from './BookletSections';
import { PlanMapSvg } from './PlanMapSvg';

type Ring = [number, number][];

function boundaryRings(c: Cemetery): Ring[] {
  const b = c.boundary;
  if (!b) return [];
  if (b.type === 'Polygon') return [b.coordinates[0] as Ring];
  return b.coordinates.map((poly) => poly[0] as Ring);
}

function Part({
  title,
  children,
  first,
}: {
  title: ReactNode;
  children: ReactNode;
  first?: boolean;
}) {
  return (
    <section className={first ? 'mb-8' : 'mb-8 print:break-before-page'}>
      <h2 className="mb-3 text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * The printable booklet (plan §13.1): title page, plan maps, an alphabetical index, row-by-row
 * listings with thumbnails, the transcription convention, contributors and license. Print CSS
 * does the paging; "Save as PDF" in the print dialog makes a PDF.
 */
export function BookletView({
  cemetery,
  layout,
  stones,
  people,
  covers,
  contributors,
}: {
  cemetery: Cemetery;
  layout: Layout;
  stones: Monument[];
  people: Person[];
  covers: ReadonlyMap<ID, ID>;
  contributors: Contributor[];
}) {
  const { t, i18n } = useLingui();
  const [photos, setPhotos] = useState(true);
  const booklet = useMemo(
    () => buildBooklet({ cemetery, sections: layout.sections, rows: layout.rows, stones, people }),
    [cemetery, layout, stones, people],
  );
  const maps = useMemo(() => {
    const point = (m: Monument) =>
      m.position ? [{ id: m.id, lng: m.position.lng, lat: m.position.lat }] : [];
    const rowLines = (sectionId?: ID) =>
      layout.rows
        .filter((r) => r.line && (sectionId === undefined || r.sectionId === sectionId))
        .map((r) => r.line?.coordinates as Ring);
    const whole = planMap(
      booklet.stones.flatMap((f) => point(f.stone)),
      rowLines(),
      boundaryRings(cemetery),
    );
    const bySection =
      layout.sections.length < 2
        ? []
        : layout.sections.flatMap((s) => {
            const map = planMap(
              booklet.stones.filter((f) => f.section === s.name).flatMap((f) => point(f.stone)),
              rowLines(s.id),
            );
            return map ? [{ name: s.name, map }] : [];
          });
    return { whole, bySection };
  }, [booklet, layout, cemetery]);

  const place = [...(cemetery.adminAreas ?? [])].reverse().join(', ');
  const established = cemetery.established ? formatDate(cemetery.established) : '';
  const today = i18n.date(new Date(), { dateStyle: 'long' });
  const convention = conventionOf(cemetery.settings.transcriptionConvention);
  const stoneCount = booklet.stones.length;
  const peopleCount = booklet.people;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="flex flex-col gap-1">
          <Link to={exportPath(cemetery.id)} className="text-primary underline">
            <Trans>Back to Export and print</Trans>
          </Link>
          <h1 className="text-2xl font-bold">
            <Trans>Booklet</Trans>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={photos}
              onChange={(e) => setPhotos(e.target.checked)}
              className="size-5"
            />
            <Trans>Photos</Trans>
          </label>
          <Button onClick={() => window.print()}>
            <Trans>Print or save as PDF</Trans>
          </Button>
        </div>
      </div>

      <article aria-label={t`Booklet`} className="sbs-booklet">
        <header className="mb-8 flex min-h-[50vh] flex-col justify-center gap-3 print:min-h-[24cm] print:break-after-page">
          <h1 className="text-4xl font-bold">{cemetery.name}</h1>
          {place ? <p className="text-xl">{place}</p> : null}
          {established || cemetery.denomination ? (
            <p>
              {[established && t`Established ${established}`, cemetery.denomination]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
          <p>
            <Plural value={stoneCount} one="# stone" other="# stones" /> ·{' '}
            <Plural value={peopleCount} one="# person" other="# people" />
          </p>
          {cemetery.description ? (
            <p className="max-w-prose whitespace-pre-line">{cemetery.description}</p>
          ) : null}
          {cemetery.accessNotes ? (
            <p className="max-w-prose whitespace-pre-line text-fg-muted">{cemetery.accessNotes}</p>
          ) : null}
          <p className="text-sm text-fg-muted">
            <Trans>Compiled with StoneByStone, {today}</Trans>
          </p>
        </header>

        {maps.whole ? (
          <Part title={<Trans>Map</Trans>} first>
            <PlanMapSvg map={maps.whole} label={t`Plan of ${cemetery.name}`} />
            {maps.bySection.map(({ name, map }) => (
              <figure key={name} className="mt-6 break-inside-avoid">
                <figcaption className="mb-2 font-semibold">
                  <Trans>Section {name}</Trans>
                </figcaption>
                <PlanMapSvg map={map} label={t`Plan of section ${name}`} />
              </figure>
            ))}
          </Part>
        ) : null}

        <Part title={<Trans>Index of names</Trans>} first={!maps.whole}>
          {booklet.index.length === 0 ? (
            <p className="text-fg-muted">
              <Trans>No names transcribed yet.</Trans>
            </p>
          ) : (
            <NameIndex entries={booklet.index} />
          )}
        </Part>

        <Part title={<Trans>Stones row by row</Trans>}>
          <RowListings groups={booklet.groups} covers={covers} photos={photos} />
        </Part>

        <Part title={<Trans>About this record</Trans>}>
          <h3 className="mb-2 text-lg font-semibold">
            <Trans>Transcription convention</Trans>
          </h3>
          <ConventionReference convention={convention} />
          <h3 className="mt-6 mb-2 text-lg font-semibold">
            <Trans>Contributors</Trans>
          </h3>
          <p>
            {contributors.map((c) => c.displayName).join(', ') || (
              <Trans>No contributor names recorded.</Trans>
            )}
          </p>
          <h3 className="mt-6 mb-2 text-lg font-semibold">
            <Trans>License</Trans>
          </h3>
          <p>{cemetery.license ?? <Trans>No license chosen yet.</Trans>}</p>
        </Part>
      </article>
    </div>
  );
}
