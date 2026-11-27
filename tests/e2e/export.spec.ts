import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { importFile, skipWelcome, stubTiles } from './helpers';

test('export: CSV, GeoJSON and KML download with every stone', async ({ page }, testInfo) => {
  const file = testInfo.outputPath('export.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 2, perRow: 3 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: /^Export and print/ }).click();
  await expect(page.getByText('6 placed stones', { exact: false })).toBeVisible();

  const save = async (button: string, name: string) => {
    const [d] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: button }).click(),
    ]);
    expect(d.suggestedFilename()).toBe(name);
    const path = testInfo.outputPath(name);
    await d.saveAs(path);
    return readFile(path, 'utf8');
  };

  const csv = await save('Download CSV', 'performance-test-6-stones-people.csv');
  expect(csv.startsWith('﻿Surname,Given names,')).toBe(true);
  expect(csv.trim().split('\r\n')).toHaveLength(7);

  const geo = JSON.parse(await save('Download GeoJSON', 'performance-test-6-stones.geojson')) as {
    features: { properties: { place: string } }[];
  };
  expect(geo.features).toHaveLength(6);
  expect(geo.features[4]?.properties.place).toBe('Row 2, stone 2');

  const kml = await save('Download KML', 'performance-test-6-stones.kml');
  expect(kml.match(/<Placemark /g)).toHaveLength(6);
  expect(kml.match(/<Folder>/g)).toHaveLength(2);
});
