/** In-app camera helpers (plan §8): stream, still capture, haptics. No React. */

export function cameraSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

/** Rear camera at the best resolution it offers; stones need detail for transcription. */
export function openCameraStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 4096 },
      height: { ideal: 3072 },
    },
  });
}

export function stopStream(stream: MediaStream | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}

interface ImageCaptureLike {
  takePhoto(): Promise<Blob>;
}
declare const ImageCapture: { new (track: MediaStreamTrack): ImageCaptureLike } | undefined;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/** The current video frame as a JPEG. */
function frameToJpeg(video: HTMLVideoElement): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext('2d')?.drawImage(video, 0, 0);
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('capture failed'))), 'image/jpeg', 0.92),
  );
}

/**
 * A still photo. `ImageCapture.takePhoto()` (Chrome) uses the full sensor resolution; it can
 * be slow or hang on some devices, so it is bounded and falls back to the video frame.
 */
export async function takeStill(video: HTMLVideoElement, stream: MediaStream): Promise<Blob> {
  const track = stream.getVideoTracks()[0];
  if (track && typeof ImageCapture !== 'undefined') {
    try {
      return await withTimeout(new ImageCapture(track).takePhoto(), 1500);
    } catch {
      // fall through
    }
  }
  return frameToJpeg(video);
}

/** Short buzz to confirm a capture; silently does nothing where unsupported (iOS). */
export function haptic(pattern: number | number[] = 30) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}
