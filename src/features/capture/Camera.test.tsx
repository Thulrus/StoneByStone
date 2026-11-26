import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { usePrefs } from '../../app/prefs';
import type { PhotoRole } from '../../domain';
import { renderWithProviders } from '../../test/render';
import { Camera } from './Camera';

function Harness({ onCapture }: { onCapture: (b: Blob, r: PhotoRole) => void }) {
  const [role, setRole] = useState<PhotoRole>('front');
  return (
    <Camera
      open
      onClose={() => {}}
      title="Row 4 · stone 12"
      role={role}
      onRoleChange={setRole}
      onCapture={onCapture}
    />
  );
}

afterEach(() => {
  act(() => usePrefs.setState({ systemCamera: false }));
  vi.unstubAllGlobals();
});

test('without getUserMedia it uses the phone camera app, with the chosen role', async () => {
  const onCapture = vi.fn();
  renderWithProviders(<Harness onCapture={onCapture} />);
  expect(screen.getByRole('status')).toHaveTextContent(/isn't available/);
  await userEvent.click(screen.getByRole('radio', { name: 'Back' }));
  expect(screen.getByRole('radio', { name: 'Back' })).toHaveAttribute('aria-checked', 'true');

  const photo = new File([new Uint8Array([1, 2, 3])], 'p.jpg', { type: 'image/jpeg' });
  await userEvent.upload(screen.getByTestId('camera-file'), photo);
  expect(onCapture).toHaveBeenCalledWith(photo, 'back');
});

test('a refused permission says so; the preference skips the in-app camera', async () => {
  const getUserMedia = vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError'));
  vi.stubGlobal('isSecureContext', true);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  const { unmount } = renderWithProviders(<Harness onCapture={() => {}} />);
  expect(await screen.findByText(/permission was refused/)).toBeInTheDocument();
  unmount();

  getUserMedia.mockClear();
  act(() => usePrefs.setState({ systemCamera: true }));
  renderWithProviders(<Harness onCapture={() => {}} />);
  expect(screen.getByRole('status')).toHaveTextContent(/phone's camera app/);
  expect(getUserMedia).not.toHaveBeenCalled();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
});
