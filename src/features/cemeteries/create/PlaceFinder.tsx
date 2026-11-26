import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import type { LngLat } from '../../../domain';
import { Button } from '../../../ui/Button';
import { Field } from '../../../ui/Field';
import { cemeteriesNear, currentLocation, searchPlaces } from './osm-client';
import type { PlaceCandidate } from './osm';

export interface PlaceFinderProps {
  selectedKey?: string;
  onPick: (c: PlaceCandidate) => void;
  /** GPS fix from "Near me", so the map can show it. */
  onLocated: (at: LngLat) => void;
}

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; what: 'search' | 'gps' | 'near' }
  | { kind: 'done'; via: 'search' | 'near'; results: PlaceCandidate[] }
  | { kind: 'error'; message: string };

/** Search by name/place (Nominatim) or list cemeteries near me (Overpass). Network on tap only. */
export function PlaceFinder({ selectedKey, onPick, onLocated }: PlaceFinderProps) {
  const { t, i18n } = useLingui();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const offline = t`Couldn't reach the map service. Check the connection, or drop a pin instead.`;

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus({ kind: 'busy', what: 'search' });
    try {
      setStatus({ kind: 'done', via: 'search', results: await searchPlaces(query, i18n.locale) });
    } catch {
      setStatus({ kind: 'error', message: offline });
    }
  };

  const near = async () => {
    setStatus({ kind: 'busy', what: 'gps' });
    let at: LngLat;
    try {
      at = await currentLocation();
    } catch {
      setStatus({
        kind: 'error',
        message: t`Couldn't get your location. Search or drop a pin instead.`,
      });
      return;
    }
    onLocated(at);
    setStatus({ kind: 'busy', what: 'near' });
    try {
      let results = await cemeteriesNear(at);
      if (results.length === 0) results = await cemeteriesNear(at, 5000);
      setStatus({ kind: 'done', via: 'near', results });
    } catch {
      setStatus({ kind: 'error', message: offline });
    }
  };

  const busy = status.kind === 'busy';
  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={(e) => void search(e)} className="flex flex-wrap items-end gap-2">
        <Field
          className="min-w-48 flex-1"
          label={t`Search by name or place`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={busy || !query.trim()}>
          <Trans>Search</Trans>
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void near()}>
          <Trans>Cemeteries near me</Trans>
        </Button>
      </form>
      <p className="text-sm text-fg-muted" aria-live="polite">
        {status.kind === 'busy'
          ? status.what === 'gps'
            ? t`Getting your location…`
            : t`Searching OpenStreetMap…`
          : status.kind === 'error'
            ? status.message
            : status.kind === 'done' && status.results.length === 0
              ? t`Nothing found. Try another search, or drop a pin.`
              : null}
      </p>
      {status.kind === 'done' && status.results.length > 0 ? (
        <ul aria-label={t`Places found`} className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {status.results.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                aria-pressed={c.key === selectedKey}
                onClick={() => onPick(c)}
                className="flex min-h-12 w-full flex-col items-start rounded-lg px-3 py-2 text-start hover:bg-surface-2 aria-pressed:bg-surface-2 aria-pressed:ring-2 aria-pressed:ring-primary"
              >
                <span className="font-semibold">{c.name ?? t`Unnamed cemetery`}</span>
                <span className="text-sm text-fg-muted">
                  {[
                    c.distanceM !== undefined
                      ? c.distanceM === 0
                        ? t`You are here`
                        : t`${Math.round(c.distanceM)} m away`
                      : c.detail,
                    c.boundary ? t`boundary available` : undefined,
                    c.isCemetery ? undefined : t`not tagged as a cemetery`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {status.kind === 'done' && status.results.length > 0 ? (
        <p className="text-sm text-fg-muted">
          <Plural value={status.results.length} one="# place" other="# places" />{' '}
          <Trans>from OpenStreetMap.</Trans>
        </p>
      ) : null}
    </div>
  );
}
