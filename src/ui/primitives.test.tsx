import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/render';
import { Chip } from './Chip';
import { Field } from './Field';
import { Sheet } from './Sheet';
import { toast, useToasts } from './toast-store';
import { Toaster } from './Toaster';

describe('Chip', () => {
  it('toggles aria-pressed and shows a non-color indicator', async () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return (
        <Chip selected={on} onSelectedChange={setOn}>
          Granite
        </Chip>
      );
    }
    renderWithProviders(<Harness />);
    const chip = screen.getByRole('button', { name: 'Granite' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveTextContent('✓');
  });
});

describe('Field', () => {
  it('links label, hint and error', () => {
    renderWithProviders(<Field label="Surname" hint="As carved" error="Required" />);
    const input = screen.getByLabelText('Surname');
    expect(input).toHaveAccessibleDescription('As carved Required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Sheet', () => {
  it('opens as a labelled dialog and closes with the close button', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <Sheet open onOpenChange={onOpenChange} title="Row 4">
        Body
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Row 4' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('Toaster', () => {
  it('runs the undo action', async () => {
    const onAction = vi.fn();
    renderWithProviders(<Toaster />);
    act(() => {
      toast({ title: 'Stone deleted', action: { label: 'Undo', onAction } });
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalledOnce();
    act(() => useToasts.setState({ toasts: [] }));
  });
});
