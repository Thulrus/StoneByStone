import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { cemeteryPath } from '../../../app/paths';
import { useStore } from '../../../app/store-context';
import { createCemetery, type CemeteryPlace } from '../../../data/cemeteries';
import type { LngLat } from '../../../domain';
import { pointInPolygon } from '../../../geo';
import { Button } from '../../../ui/Button';
import { Field } from '../../../ui/Field';
import { ensurePersisted } from '../../settings/storage';
import type { PlaceCandidate } from './osm';
import { PlaceFinder } from './PlaceFinder';
import { PlaceMap } from './PlaceMap';

const FORM_ID = 'new-cemetery';

interface Place extends CemeteryPlace {
  key?: string;
}

/**
 * New cemetery (plan §11): name it, then optionally find it by search, "near me" (with the
 * OSM boundary prefilled), or a dropped pin. Only the name is required.
 */
export function NewCemeteryPage() {
  const { t } = useLingui();
  const store = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [error, setError] = useState<string>();
  const [place, setPlace] = useState<Place>({});
  const [showMap, setShowMap] = useState(false);

  const pick = (c: PlaceCandidate) => {
    setPlace({
      key: c.key,
      location: c.location,
      boundary: c.boundary,
      country: c.country,
      adminAreas: c.adminAreas,
      externalIds: c.osm ? { osm: c.osm } : undefined,
    });
    if (c.name && (!nameTouched || !name.trim())) {
      setName(c.name);
      setError(undefined);
    }
    setShowMap(true);
  };

  // A pin inside the chosen boundary keeps it; elsewhere, the OSM match no longer applies.
  const pin = (at: LngLat) =>
    setPlace((p) =>
      p.boundary && pointInPolygon([at.lng, at.lat], p.boundary)
        ? { ...p, location: at }
        : { location: at },
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t`Enter a name.`);
      return;
    }
    const { key: _key, ...data } = place;
    const cem = await createCemetery(store, name, data);
    void ensurePersisted();
    void navigate(cemeteryPath(cem.id), { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        <Trans>New cemetery</Trans>
      </h1>
      {/* Its own form: the search form below can't nest inside it. */}
      <form id={FORM_ID} onSubmit={(e) => void submit(e)}>
        <Field
          label={t`Name`}
          value={name}
          error={error}
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setNameTouched(true);
            setError(undefined);
          }}
        />
      </form>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          <Trans>Where is it? (optional)</Trans>
        </h2>
        <PlaceFinder
          selectedKey={place.key}
          onPick={pick}
          onLocated={(at) => {
            setShowMap(true);
            setPlace((p) => (p.location ? p : { location: at }));
          }}
        />
        {showMap ? (
          <>
            <div className="h-80 overflow-hidden rounded-xl">
              <PlaceMap location={place.location} boundary={place.boundary} onPin={pin} />
            </div>
            <p className="text-sm text-fg-muted" aria-live="polite">
              {place.boundary
                ? t`Boundary from OpenStreetMap. Tap the map to move the pin.`
                : place.location
                  ? t`Pin placed. Tap the map to move it.`
                  : t`Tap the map where the cemetery is.`}
            </p>
          </>
        ) : (
          <Button variant="secondary" className="self-start" onClick={() => setShowMap(true)}>
            <Trans>Drop a pin on the map</Trans>
          </Button>
        )}
      </section>
      <div className="flex justify-end gap-2">
        <Link
          to="/"
          className="inline-flex min-h-12 items-center rounded-lg px-4 hover:bg-surface-2"
        >
          <Trans>Cancel</Trans>
        </Link>
        <Button type="submit" form={FORM_ID}>
          <Trans>Create</Trans>
        </Button>
      </div>
    </div>
  );
}
