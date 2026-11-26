import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../../app/routes';
import { listCemeteries } from '../../../data/cemeteries';
import { ONBOARDED_KEY, setSetting } from '../../../data/settings';
import { renderWithStore, testStore } from '../../../test/render';
import { resetOsmClient } from './osm-client';

vi.mock('../../map/LazyMap', () => ({
  LazyMap: ({ label }: { label: string }) => <div role="region" aria-label={label} />,
}));

const ring = [
  [-71.55, 43.2],
  [-71.54, 43.2],
  [-71.54, 43.21],
  [-71.55, 43.2],
];

async function open() {
  const store = await testStore();
  await setSetting(store, ONBOARDED_KEY, true);
  const router = createMemoryRouter(routes, { initialEntries: ['/new'] });
  await renderWithStore(<RouterProvider router={router} />, store);
  return { store, router };
}

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  resetOsmClient();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body)));

describe('new cemetery', () => {
  it('makes no network request until asked', async () => {
    await open();
    await screen.findByRole('textbox', { name: 'Name' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: /Map/ })).toBeNull();
  });

  it('searches, prefills name and boundary, and creates', async () => {
    fetchMock.mockImplementation(() =>
      ok([
        {
          osm_type: 'way',
          osm_id: 22,
          lat: '43.205',
          lon: '-71.545',
          name: 'Old North Cemetery',
          category: 'landuse',
          type: 'cemetery',
          address: { country_code: 'us', state: 'New Hampshire', city: 'Concord' },
          geojson: { type: 'Polygon', coordinates: [ring] },
        },
      ]),
    );
    const { store } = await open();
    await userEvent.type(
      await screen.findByRole('searchbox', { name: 'Search by name or place' }),
      'old north concord',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await userEvent.click(await screen.findByRole('button', { name: /Old North Cemetery/ }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('nominatim.openstreetmap.org/search');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Old North Cemetery');
    expect(await screen.findByRole('region', { name: /Map/ })).toBeInTheDocument();
    expect(screen.getByText(/Boundary from OpenStreetMap/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByRole('heading', { name: 'Old North Cemetery' });
    const [cem] = await listCemeteries(store);
    expect(cem).toMatchObject({
      name: 'Old North Cemetery',
      country: 'US',
      adminAreas: ['New Hampshire', 'Concord'],
      externalIds: { osm: 'way/22' },
      location: { lng: -71.545, lat: 43.205 },
    });
    expect(cem?.boundary).toEqual({ type: 'Polygon', coordinates: [ring] });
  });

  it('finds cemeteries near me with the boundary from Overpass', async () => {
    const getCurrentPosition = vi.fn((ok: PositionCallback) =>
      ok({ coords: { longitude: -71.545, latitude: 43.203, accuracy: 8 } } as GeolocationPosition),
    );
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    fetchMock.mockImplementation(() =>
      ok({
        elements: [
          {
            type: 'way',
            id: 5,
            tags: { name: 'Churchyard', amenity: 'grave_yard' },
            geometry: ring.map(([lon, lat]) => ({ lon, lat })),
          },
        ],
      }),
    );
    const { store } = await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Cemeteries near me' }));
    await userEvent.click(await screen.findByRole('button', { name: /Churchyard/ }));
    expect(screen.getByText(/You are here/)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('overpass');
    expect(String(init.body)).toContain('around');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(async () => expect(await listCemeteries(store)).toHaveLength(1));
    const [cem] = await listCemeteries(store);
    expect(cem?.boundary?.type).toBe('Polygon');
    expect(cem?.externalIds).toEqual({ osm: 'way/5' });
  });

  it('reports a failed search and still allows a name-only cemetery', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    const { store } = await open();
    await userEvent.type(await screen.findByRole('searchbox'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText(/Couldn't reach the map service/)).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Hilltop');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(async () => expect((await listCemeteries(store))[0]?.name).toBe('Hilltop'));
    expect((await listCemeteries(store))[0]?.location).toBeUndefined();
  });
});
