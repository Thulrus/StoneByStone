import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFile } from 'node:fs/promises';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { expect, test, vi } from 'vitest';
import { cemeteryPath } from '../../app/paths';
import { routes } from '../../app/routes';
import { ONBOARDED_KEY, setSetting } from '../../data/settings';
import { importV1 } from '../../data/v1/import';
import { renderWithStore, testStore } from '../../test/render';

vi.mock('../map/LazyMap', () => ({
  LazyMap: ({ label }: { label: string }) => <div role="region" aria-label={label} />,
}));

test('a v1 grid cemetery with no coordinates opens on the diagram with every stone', async () => {
  const store = await testStore();
  await setSetting(store, ONBOARDED_KEY, true);
  const json: unknown = JSON.parse(
    await readFile('tests/fixtures/v1/willow-creek-example.cem.json', 'utf8'),
  );
  const { cemeteryId } = await importV1(store, json);
  const router = createMemoryRouter(routes, { initialEntries: [cemeteryPath(cemeteryId)] });
  await renderWithStore(<RouterProvider router={router} />, store);

  expect(await screen.findByRole('tab', { name: 'Diagram' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const grid = screen.getByLabelText(/v1 grid, 20 rows by 25 columns/);
  const stones = within(grid).getAllByRole('button', { name: /^Grid row \d+, column \d+: / });
  expect(stones).toHaveLength(37);

  await userEvent.click(stones[0] as HTMLElement);
  const sheet = await screen.findByRole('dialog');
  expect(sheet).toHaveTextContent(/v1 grid row \d+, column \d+/);
});
