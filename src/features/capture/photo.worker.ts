/// <reference lib="webworker" />
import { processPhoto, type ProcessOptions } from './pipeline';

export interface PhotoJob {
  id: number;
  file: Blob;
  options: ProcessOptions;
}

self.onmessage = async (e: MessageEvent<PhotoJob>) => {
  const { id, file, options } = e.data;
  try {
    self.postMessage({ id, ok: true, result: await processPhoto(file, options) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
