import { useCallback, useRef, useState } from 'react';
import { useStore } from '../../app/store-context';
import type { ID, Shot } from '../../domain';
import type { ProcessedPhoto } from '../capture/pipeline';
import { processForCemetery } from '../capture/useSavePhoto';

/** A photo file after the pipeline: what planning needs, plus what writing it needs. */
export interface ReadShot extends Shot {
  file: File;
  processed: ProcessedPhoto;
}

export interface ReadState {
  total: number;
  done: number;
  shots: ReadShot[];
  failed: string[];
  reading: boolean;
}

const IDLE: ReadState = { total: 0, done: 0, shots: [], failed: [], reading: false };

/** Runs each chosen file through the photo pipeline, one at a time, with progress. */
export function useReadPhotos(cemeteryId: ID) {
  const store = useStore();
  const [state, setState] = useState<ReadState>(IDLE);
  const run = useRef(0);

  const read = useCallback(
    async (files: readonly File[]) => {
      const me = ++run.current;
      const images = files.filter((f) => f.type.startsWith('image/') || f.type === '');
      setState({ ...IDLE, total: images.length, reading: true });
      for (const file of images) {
        if (run.current !== me) return;
        try {
          const processed = await processForCemetery(store, cemeteryId, file);
          const shot: ReadShot = {
            name: file.name,
            sha256: processed.sha256,
            file,
            processed,
            ...(processed.takenAt ? { takenAt: processed.takenAt } : {}),
            ...(processed.gps ? { gps: processed.gps } : {}),
          };
          setState((s) => ({ ...s, done: s.done + 1, shots: [...s.shots, shot] }));
        } catch {
          setState((s) => ({ ...s, done: s.done + 1, failed: [...s.failed, file.name] }));
        }
      }
      if (run.current === me) setState((s) => ({ ...s, reading: false }));
    },
    [store, cemeteryId],
  );

  const reset = useCallback(() => {
    run.current++;
    setState(IDLE);
  }, []);

  return { state, read, reset };
}
