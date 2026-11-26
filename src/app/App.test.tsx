import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderWithStore } from '../test/render';
import { resolveTheme, usePrefs } from './prefs';
import { routes } from './routes';

async function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  await renderWithStore(<RouterProvider router={router} />);
  return router;
}

describe('routes', () => {
  it('renders Home at /', async () => {
    await renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Cemeteries' })).toBeInTheDocument();
  });

  it('lazy-loads Settings', async () => {
    await renderAt('/settings');
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('shows a not-found page for unknown routes', async () => {
    await renderAt('/nope');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('theme preference', () => {
  it('persists the chosen theme', async () => {
    await renderAt('/settings');
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
