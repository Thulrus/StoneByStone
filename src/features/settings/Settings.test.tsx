import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SettingsPage } from '../../app/pages/SettingsPage';
import { createCemetery } from '../../data/cemeteries';
import { currentContributor, getCemeteryDefaults } from '../../data/settings';
import { renderWithStore, testStore } from '../../test/render';
import { formatBytes } from './storage';

describe('Settings', () => {
  it('shows the version and build this device runs', async () => {
    await renderWithStore(<SettingsPage />);
    const about = screen.getByRole('region', { name: 'About this app' });
    expect(within(about).getByText(/^\d+\.\d+\.\d+/)).toBeInTheDocument();
    expect(within(about).getByText(/^([0-9a-f]{7,}|unknown)$/)).toBeInTheDocument();
    expect(within(about).getByRole('button', { name: 'Check for updates' })).toBeEnabled();
  });

  it('renames the contributor', async () => {
    const { store } = await renderWithStore(<SettingsPage />);
    const name = await screen.findByRole('textbox', { name: 'Name' });
    await userEvent.type(name, 'Grace');
    await userEvent.type(screen.getByRole('textbox', { name: 'Contact (optional)' }), 'g@x.org');
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(async () =>
      expect(await currentContributor(store)).toMatchObject({
        displayName: 'Grace',
        contact: 'g@x.org',
      }),
    );
  });

  it('sets units and photo quality for new cemeteries', async () => {
    const { store } = await renderWithStore(<SettingsPage />);
    await userEvent.click(await screen.findByRole('radio', { name: 'Metres' }));
    await userEvent.click(screen.getByRole('radio', { name: '2400 px' }));
    await waitFor(async () =>
      expect(await getCemeteryDefaults(store)).toEqual({ units: 'metric', photoMaxPx: 2400 }),
    );
  });

  it('shows storage per cemetery', async () => {
    const store = await testStore();
    await createCemetery(store, 'Old North');
    const gone = await createCemetery(store, 'Hillside');
    await store.cemeteries.delete(gone.id);
    await renderWithStore(<SettingsPage />, store);
    const table = await screen.findByRole('table', { name: 'Storage per cemetery' });
    expect(within(table).getByRole('rowheader', { name: 'Old North' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: /Hillside.*deleted/ })).toBeInTheDocument();
  });
});

describe('formatBytes', () => {
  it('uses readable units', () => {
    expect(formatBytes(512, 'en')).toBe('512 bytes');
    expect(formatBytes(1_500_000, 'en')).toBe('1.5 MB');
    expect(formatBytes(2_400_000_000, 'en')).toBe('2.4 GB');
  });
});
