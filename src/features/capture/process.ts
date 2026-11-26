/**
 * Entry point for the photo pipeline: a worker when the browser can decode and draw off the
 * main thread, otherwise the same code inline. A worker failure falls back to inline once
 * and stays inline for the session.
 */
import type { PhotoJob } from './photo.worker';
import type { ProcessedPhoto, ProcessOptions } from './pipeline';

type Reply =
  { id: number; ok: true; result: ProcessedPhoto } | { id: number; ok: false; error: string };

let worker: Worker | undefined;
let workerBroken = false;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (p: ProcessedPhoto) => void; reject: (e: Error) => void }
>();

function canUseWorker() {
  return (
    !workerBroken &&
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap !== 'undefined'
  );
}

function getWorker(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL('./photo.worker.ts', import.meta.url), { type: 'module' });
  w.onmessage = (e: MessageEvent<Reply>) => {
    const job = pending.get(e.data.id);
    if (!job) return;
    pending.delete(e.data.id);
    if (e.data.ok) job.resolve(e.data.result);
    else job.reject(new Error(e.data.error));
  };
  w.onerror = (e) => {
    e.preventDefault();
    workerBroken = true;
    worker = undefined;
    w.terminate();
    for (const job of pending.values()) job.reject(new Error('worker failed'));
    pending.clear();
  };
  return (worker = w);
}

function inWorker(file: Blob, options: ProcessOptions): Promise<ProcessedPhoto> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, file, options } satisfies PhotoJob);
  });
}

async function inline(file: Blob, options: ProcessOptions) {
  const { processPhoto } = await import('./pipeline');
  return processPhoto(file, options);
}

export async function processPhotoFile(
  file: Blob,
  options: ProcessOptions,
): Promise<ProcessedPhoto> {
  if (canUseWorker()) {
    try {
      return await inWorker(file, options);
    } catch {
      // Decode errors repeat inline and surface there; a broken worker is not retried.
    }
  }
  return inline(file, options);
}
