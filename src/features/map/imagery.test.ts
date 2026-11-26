import {
  customProvider,
  customSourceProblem,
  defaultProviderId,
  ESRI_ID,
  inUsCoverage,
  OSM_ID,
  PRESETS,
  resolveProvider,
  tileUrls,
  USGS_ID,
  wmsTemplate,
  type CustomSource,
} from './imagery';

const vermont = { lng: -72.68, lat: 43.47 };
const york = { lng: -1.08, lat: 53.96 };

describe('imagery providers', () => {
  it('every preset has attribution and a valid template', () => {
    for (const p of PRESETS) {
      expect(p.attribution.length).toBeGreaterThan(5);
      expect(p.tiles[0]).toMatch(/^https:\/\/.*\{z\}/);
    }
  });

  it('only USGS allows offline download among presets', () => {
    expect(PRESETS.filter((p) => p.allowsOffline).map((p) => p.id)).toEqual([USGS_ID]);
  });

  it('knows US coverage, including Alaska, Hawaii and Puerto Rico', () => {
    expect(inUsCoverage(vermont)).toBe(true);
    expect(inUsCoverage({ lng: -149.9, lat: 61.2 })).toBe(true);
    expect(inUsCoverage({ lng: -157.86, lat: 21.31 })).toBe(true);
    expect(inUsCoverage({ lng: -66.1, lat: 18.47 })).toBe(true);
    expect(inUsCoverage(york)).toBe(false);
    expect(inUsCoverage({ lng: -75.7, lat: 45.42 })).toBe(true); // Ottawa sits in the CONUS box
  });

  it('defaults to USGS in the US, else Esri with a key, else OSM', () => {
    expect(defaultProviderId(vermont)).toBe(USGS_ID);
    expect(defaultProviderId(york)).toBe(OSM_ID);
    expect(defaultProviderId(york, { esri: 'k' })).toBe(ESRI_ID);
    expect(defaultProviderId(undefined)).toBe(OSM_ID);
  });

  it('falls back when the chosen provider needs a missing key or is unknown here', () => {
    expect(resolveProvider(ESRI_ID, vermont, [], {}).id).toBe(USGS_ID);
    expect(resolveProvider(ESRI_ID, vermont, [], { esri: 'k' }).id).toBe(ESRI_ID);
    expect(resolveProvider('custom:gone', york, [], {}).id).toBe(OSM_ID);
  });

  it('fills the key into tile URLs', () => {
    const esri = PRESETS.find((p) => p.id === ESRI_ID)!;
    expect(tileUrls(esri, { esri: 'a b' })[0]).toContain('token=a%20b');
  });
});

describe('custom sources', () => {
  const xyz: CustomSource = {
    id: 'custom:1',
    name: 'County orthos',
    type: 'xyz',
    url: 'https://tiles.example.gov/ortho/{z}/{x}/{y}.jpg',
    attribution: 'Example County <GIS>',
    maxzoom: 20,
    allowsOffline: false,
  };

  it('validates URLs', () => {
    expect(customSourceProblem(xyz)).toBeUndefined();
    expect(customSourceProblem({ ...xyz, url: 'https://x.org/{quadkey}' })).toBeUndefined();
    expect(customSourceProblem({ ...xyz, url: 'not a url' })).toBe('url');
    expect(customSourceProblem({ ...xyz, url: 'http://x.org/{z}/{x}/{y}' })).toBe('https');
    expect(customSourceProblem({ ...xyz, url: 'https://x.org/{z}/{x}' })).toBe('placeholders');
    expect(customSourceProblem({ type: 'wms', url: 'https://x.org/wms' })).toBe('layers');
    expect(customSourceProblem({ type: 'wms', url: 'https://x.org/wms', layers: 'a' })).toBe(
      undefined,
    );
  });

  it('builds a WMS GetMap template, replacing conflicting params', () => {
    const t = wmsTemplate(
      'https://x.org/wms?map=ortho&request=GetCapabilities&BBOX=1',
      'ortho2024',
    );
    expect(t).toContain('map=ortho');
    expect(t).toContain('REQUEST=GetMap');
    expect(t).not.toContain('GetCapabilities');
    expect(t).toContain('CRS=EPSG%3A3857');
    expect(t.endsWith('&BBOX={bbox-epsg-3857}')).toBe(true);
    expect(t.match(/BBOX/g)).toHaveLength(1);
  });

  it('escapes user attribution and resolves to the custom provider', () => {
    const p = customProvider(xyz);
    expect(p.attribution).toBe('Example County &#60;GIS&#62;');
    expect(resolveProvider('custom:1', york, [xyz], {}).name).toBe('County orthos');
  });
});
