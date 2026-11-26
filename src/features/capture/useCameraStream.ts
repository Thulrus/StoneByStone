import { useEffect, useState } from 'react';
import { cameraSupported, openCameraStream, stopStream } from './camera';

export type CameraState =
  | { kind: 'off' }
  | { kind: 'starting' }
  | { kind: 'live'; stream: MediaStream }
  | { kind: 'unavailable'; reason: 'unsupported' | 'denied' | 'failed' };

type Result = Extract<CameraState, { kind: 'live' | 'unavailable' }>;

/** A rear-camera stream while `on`; stopped as soon as it isn't (battery, privacy). */
export function useCameraStream(on: boolean): CameraState {
  const supported = cameraSupported();
  const [result, setResult] = useState<Result>();
  useEffect(() => {
    if (!on || !supported) return;
    let live = true;
    let stream: MediaStream | undefined;
    openCameraStream().then(
      (s) => {
        if (!live) return stopStream(s);
        stream = s;
        setResult({ kind: 'live', stream: s });
      },
      (err: unknown) => {
        if (!live) return;
        const denied = err instanceof DOMException && err.name === 'NotAllowedError';
        setResult({ kind: 'unavailable', reason: denied ? 'denied' : 'failed' });
      },
    );
    return () => {
      live = false;
      stopStream(stream);
      setResult(undefined);
    };
  }, [on, supported]);
  if (!on) return { kind: 'off' };
  if (!supported) return { kind: 'unavailable', reason: 'unsupported' };
  return result ?? { kind: 'starting' };
}
