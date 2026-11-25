import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/render';
import { resolveTheme, usePrefs } from './prefs';
import { routes } from './routes';

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  renderWithProviders(<RouterProvider router={router} />);
  return router;
}

describe('routes', () => {
  it('renders Home at /', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Cemeteries' })).toBeInTheDocument();
  });

  it('lazy-loads Settings', async () => {
    renderAt('/settings');
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('shows a not-found page for unknown routes', async () => {
    renderAt('/nope');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('theme preference', () => {
  it('persists the chosen theme', async () => {
    renderAt('/settings');
    await userEvent.click(await screen.findByRole('radio', { name: 'Sunlight (high contrast)' }));
    expect(usePrefs.getState().theme).toBe('sunlight');
    expect(JSON.parse(localStorage.getItem('stonebystone:prefs') ?? '{}').state.theme).toBe(
      'sunlight',
    );
  });

  it('resolves "system" from the OS setting', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('sunlight', true)).toBe('sunlight');
  });
});
