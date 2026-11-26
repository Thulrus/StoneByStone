import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/routes';
import { createCemetery } from '../../data/cemeteries';
import { currentContributor } from '../../data/settings';
import type { Store } from '../../data/store';
import { renderWithStore, testStore } from '../../test/render';
import { Toaster } from '../../ui/Toaster';
import { useToasts } from '../../ui/toast-store';

async function renderHome(store?: Store) {
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  const r = await renderWithStore(
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>,
    store,
  );
  return { ...r, router };
}

beforeEach(() => {
  useToasts.setState({ toasts: [] });
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

describe('first launch', () => {
  it('asks for a name and records it', async () => {
    const { store } = await renderHome();
    await userEvent.type(await screen.findByRole('textbox', { name: 'Name' }), 'Ada');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByText(/What’s your name/)).toBeNull());
    expect((await currentContributor(store)).displayName).toBe('Ada');
  });

  it('can be skipped', async () => {
    await renderHome();
    await userEvent.click(await screen.findByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(screen.queryByText(/What’s your name/)).toBeNull());
  });
});

describe('Home', () => {
  it('creates cemeteries and switches between them', async () => {
    const { router } = await renderHome();
    for (const name of ['Bethel', 'Arlington']) {
      await userEvent.click(await screen.findByRole('button', { name: 'New cemetery' }));
      await userEvent.type(
        within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Name' }),
        name,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Create' }));
      expect(await screen.findByRole('heading', { name })).toBeInTheDocument();
      await router.navigate('/');
    }
    const list = await screen.findByRole('list', { name: 'Cemeteries on this device' });
    const links = within(list).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      expect.stringContaining('Arlington'),
      expect.stringContaining('Bethel'),
    ]);
    await userEvent.click(within(list).getByRole('link', { name: /Bethel/ }));
    expect(await screen.findByRole('heading', { name: 'Bethel' })).toBeInTheDocument();
    await router.navigate('/');
    await userEvent.click(
      within(await screen.findByRole('list', { name: 'Cemeteries on this device' })).getByRole(
        'link',
        { name: /Arlington/ },
      ),
    );
    expect(await screen.findByRole('heading', { name: 'Arlington' })).toBeInTheDocument();
  });

  it('shows progress and deletes with undo', async () => {
    const store = await testStore();
    const cem = await createCemetery(store, 'Old North');
    const m = await store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
    await store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
    await store.persons.create({ cemeteryId: cem.id, monumentId: m.id, name: { surname: 'A' } });
    await renderHome(store);
    expect(await screen.findByRole('img', { name: '50% transcribed' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /2 stones · 50% transcribed/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete Old North' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
    );
    expect(await screen.findByText(/No cemeteries on this device yet/)).toBeInTheDocument();
    expect(await store.cemeteries.get(cem.id, { includeDeleted: true })).toBeDefined();

    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('link', { name: /Old North/ })).toBeInTheDocument();
  });

  it('the backup indicator clears after an export', async () => {
    const store = await testStore();
    const cem = await createCemetery(store, 'Old North');
    await store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
    await renderHome(store);
    expect(await screen.findByText('1 stone is not backed up')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back up now' }));
    await waitFor(() => expect(screen.queryByText(/not backed up/)).toBeNull());
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Backup saved')).toBeInTheDocument();
  });
});
