import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cemeteryPath } from '../../../app/paths';
import { routes } from '../../../app/routes';
import { createCemetery } from '../../../data/cemeteries';
import { listRows } from '../../../data/layout';
import { ONBOARDED_KEY, setSetting } from '../../../data/settings';
import { renderWithStore, testStore } from '../../../test/render';
import { Toaster } from '../../../ui/Toaster';
import { useToasts } from '../../../ui/toast-store';

// jsdom has no WebGL; the map itself is covered by e2e.
vi.mock('../../map/LazyMap', () => ({
  LazyMap: ({ label }: { label: string }) => <div role="region" aria-label={label} />,
}));

async function open() {
  const store = await testStore();
  await setSetting(store, ONBOARDED_KEY, true);
  const cem = await createCemetery(store, 'Old North');
  const router = createMemoryRouter(routes, { initialEntries: [cemeteryPath(cem.id)] });
  await renderWithStore(
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>,
    store,
  );
  return { store, cem };
}

const rowLabels = async (store: Awaited<ReturnType<typeof testStore>>, id: string) =>
  (await listRows(store, id)).map((r) => r.label);

beforeEach(() => useToasts.setState({ toasts: [] }));

describe('cemetery setup', () => {
  it('opens a new cemetery on Setup and adds a series of rows', async () => {
    const { store, cem } = await open();
    expect(await screen.findByRole('tab', { name: 'Setup' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.clear(screen.getByRole('textbox', { name: 'How many' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'How many' }), '4');
    await userEvent.click(screen.getByRole('button', { name: 'Add rows 1–4' }));
    await waitFor(async () => expect(await rowLabels(store, cem.id)).toEqual(['1', '2', '3', '4']));
    // The next add continues the series.
    expect(await screen.findByRole('textbox', { name: 'First row' })).toHaveValue('5');
  });

  it('adds sections with lettered rows and reorders them', async () => {
    const { store, cem } = await open();
    await userEvent.type(await screen.findByRole('textbox', { name: 'New section' }), 'West');
    await userEvent.click(screen.getByRole('button', { name: 'Add section' }));
    const west = await screen.findByRole('heading', { name: 'West' });
    const block = within(west.closest('section') as HTMLElement);
    await userEvent.clear(block.getByRole('textbox', { name: 'First row' }));
    await userEvent.type(block.getByRole('textbox', { name: 'First row' }), 'A');
    await userEvent.clear(block.getByRole('textbox', { name: 'How many' }));
    await userEvent.type(block.getByRole('textbox', { name: 'How many' }), '3');
    await userEvent.click(block.getByRole('button', { name: 'Add rows A–C' }));
    await userEvent.click(await block.findByRole('button', { name: 'Move row C up' }));
    await waitFor(async () => expect(await rowLabels(store, cem.id)).toEqual(['A', 'C', 'B']));
  });

  it('deletes a row with undo', async () => {
    const { store, cem } = await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Add row' }));
    await screen.findByRole('button', { name: 'Move row 1 up' });
    await userEvent.click(screen.getByText('⋯'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete row' }));
    await waitFor(async () => expect(await rowLabels(store, cem.id)).toEqual([]));
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await rowLabels(store, cem.id)).toEqual(['1']));
  });

  it('switches to the map', async () => {
    await open();
    await userEvent.click(await screen.findByRole('tab', { name: 'Map' }));
    expect(await screen.findByRole('region', { name: 'Map of Old North' })).toBeInTheDocument();
  });
});
