import { Plural, Trans } from '@lingui/react/macro';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { bookletPath, cemeteryPath } from '../../app/paths';
import type { Cemetery, Monument, Person } from '../../domain';
import { Button } from '../../ui/Button';
import { download, fileSlug } from '../../ui/download';
import type { Layout } from '../cemeteries/useLayout';

/** Exports for other tools (plan §13.1): CSV, GeoJSON, KML, and the printable booklet. */
export function ExportView({
  cemetery,
  layout,
  stones,
  people,
}: {
  cemetery: Cemetery;
  layout: Layout;
  stones: Monument[];
  people: Person[];
}) {
  const placed = stones.filter((m) => !m.deleted && m.position).length;
  const slug = fileSlug(cemetery.name);

  const save = async (kind: 'csv' | 'geojson' | 'kml') => {
    const flat = await import('../../data/format/flat');
    const input = { cemetery, sections: layout.sections, rows: layout.rows, stones, people };
    /* eslint-disable lingui/no-unlocalized-strings -- file names and media types */
    if (kind === 'csv') {
      // The byte-order mark makes spreadsheet apps read the file as UTF-8.
      const text = `\uFEFF${flat.peopleCsv(input)}`;
      download(new File([text], `${slug}-people.csv`, { type: 'text/csv' }));
    } else if (kind === 'geojson') {
      const text = flat.stonesGeoJson(input);
      download(new File([text], `${slug}.geojson`, { type: 'application/geo+json' }));
    } else {
      const text = flat.stonesKml(input);
      download(new File([text], `${slug}.kml`, { type: 'application/vnd.google-earth.kml+xml' }));
    }
    /* eslint-enable lingui/no-unlocalized-strings */
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link to={cemeteryPath(cemetery.id)} className="text-primary underline">
          <Trans>Back to {cemetery.name}</Trans>
        </Link>
        <h1 className="text-2xl font-bold">
          <Trans>Export and print</Trans>
        </h1>
        <p className="text-fg-muted">
          <Trans>
            For other programs. To keep or share everything, photos included, use Back up instead.
          </Trans>
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        <Choice
          title={<Trans>Spreadsheet (CSV)</Trans>}
          hint={
            <Trans>
              One line per person, with their stone's place, position and inscription. Opens in
              Excel, LibreOffice or Google Sheets.
            </Trans>
          }
          action={
            <Button variant="secondary" onClick={() => void save('csv')}>
              <Trans>Download CSV</Trans>
            </Button>
          }
        />
        <Choice
          title={<Trans>Map points (GeoJSON)</Trans>}
          hint={
            <Trans>
              <Plural value={placed} one="# placed stone" other="# placed stones" /> as points with
              their names and text, for QGIS or other GIS software.
            </Trans>
          }
          action={
            <Button
              variant="secondary"
              disabled={placed === 0}
              onClick={() => void save('geojson')}
            >
              <Trans>Download GeoJSON</Trans>
            </Button>
          }
        />
        <Choice
          title={<Trans>Google Earth (KML)</Trans>}
          hint={<Trans>The same points, in a folder per row.</Trans>}
          action={
            <Button variant="secondary" disabled={placed === 0} onClick={() => void save('kml')}>
              <Trans>Download KML</Trans>
            </Button>
          }
        />
        <Choice
          title={<Trans>Printable booklet</Trans>}
          hint={
            <Trans>
              Title page, map, alphabetical index and row-by-row listings with photos, ready to
              print or save as PDF.
            </Trans>
          }
          action={
            <Link
              to={bookletPath(cemetery.id)}
              className="inline-flex min-h-11 items-center rounded-lg bg-surface-2 px-4 font-medium text-primary"
            >
              <Trans>Open booklet</Trans>
            </Link>
          }
        />
      </ul>
    </div>
  );
}

function Choice({ title, hint, action }: { title: ReactNode; hint: ReactNode; action: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="flex min-w-0 flex-1 basis-64 flex-col">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-fg-muted">{hint}</span>
      </div>
      {action}
    </li>
  );
}
