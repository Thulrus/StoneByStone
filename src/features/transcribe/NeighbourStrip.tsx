import { useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import { useStore } from '../../app/store-context';
import type { ID, Monument } from '../../domain';
import { cn } from '../../ui/cn';
import { BlobImage } from '../capture/PhotoStrip';
import { StatusIcon } from '../stones/StatusIcon';
import { photoOrder, rowNeighbours } from './queue';
import { useWheelScrollX } from './useWheelScrollX';

export interface NeighbourStripProps {
  stone: Monument;
  stones: readonly Monument[];
  /** Stones in the queue can be jumped to; the rest are shown for context only. */
  inQueue: ReadonlySet<ID>;
  onPick: (id: ID) => void;
}

/**
 * The whole row as thumbnails (plan §9), scrolled to keep the current stone in the middle.
 * Swipe, trackpad or mouse wheel scroll it; queued stones can be picked.
 */
export function NeighbourStrip({ stone, stones, inQueue, onPick }: NeighbourStripProps) {
  const { t } = useLingui();
  const { before, after } = rowNeighbours(stone, stones, Infinity);
  const list = useRef<HTMLUListElement>(null);
  useWheelScrollX(list, stone.id);
  useEffect(() => {
    list.current
      // eslint-disable-next-line lingui/no-unlocalized-strings -- a CSS selector, never shown
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [stone.id]);
  if (before.length + after.length === 0) return null;
  return (
    <ul
      ref={list}
      aria-label={t`Neighbours in the row`}
      className="flex gap-2 overflow-x-auto overscroll-x-contain pb-2"
    >
      {[...before, stone, ...after].map((m) => (
        <Neighbour
          key={m.id}
          stone={m}
          current={m.id === stone.id}
          onPick={inQueue.has(m.id) && m.id !== stone.id ? () => onPick(m.id) : undefined}
        />
      ))}
    </ul>
  );
}

function Neighbour({
  stone,
  current,
  onPick,
}: {
  stone: Monument;
  current: boolean;
  onPick: (() => void) | undefined;
}) {
  const { t } = useLingui();
  const store = useStore();
  const thumb = useLiveQuery(async () => {
    const [first] = photoOrder(await store.photos.byMonument(stone.id));
    return first ? ((await store.photos.thumb(first.id)) ?? null) : null;
  }, [store, stone.id]);
  const n = (stone.address?.rowIndex ?? 0) + 1;
  const label = t`Stone ${n}`;
  const body = (
    <>
      {thumb ? (
        <BlobImage blob={thumb} alt="" className="size-16 rounded-md object-cover" />
      ) : (
        <span className="size-16 rounded-md bg-surface-2" />
      )}
      <span className="flex items-center gap-1 text-sm">
        <StatusIcon status={stone.status} />
        {label}
      </span>
    </>
  );
  const box = cn(
    'flex shrink-0 flex-col items-center gap-1 rounded-lg p-1',
    current && 'outline-2 outline-primary',
  );
  return (
    <li aria-current={current ? 'true' : undefined}>
      {onPick ? (
        <button type="button" onClick={onPick} className={box} aria-label={t`Go to ${label}`}>
          {body}
        </button>
      ) : (
        <div className={box}>{body}</div>
      )}
    </li>
  );
}
