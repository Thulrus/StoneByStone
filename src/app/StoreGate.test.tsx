import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NewerSchemaError } from '../data/db';
import type { Store } from '../data/store';
import { renderWithProviders } from '../test/render';
import { StoreGate } from './StoreGate';
import { useStore } from './store-context';

function Probe() {
  useStore();
  return <p>ready</p>;
}

describe('StoreGate', () => {
  it('shows an error instead of opening newer data', async () => {
    const open = () => Promise.reject(new NewerSchemaError(3, 1));
    renderWithProviders(
      <StoreGate open={open}>
        <Probe />
      </StoreGate>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('This app is out of date');
    expect(screen.getByRole('alert')).toHaveTextContent('data version 3');
    expect(screen.queryByText('ready')).toBeNull();
  });

  it('renders the app once the store is open', async () => {
    const open = () => Promise.resolve({} as Store);
    renderWithProviders(
      <StoreGate open={open}>
        <Probe />
      </StoreGate>,
    );
    expect(await screen.findByText('ready')).toBeInTheDocument();
  });
});
