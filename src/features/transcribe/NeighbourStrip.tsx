import { useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../../app/store-context';
import type { ID, Monument } from '../../domain';
import { cn } from '../../ui/cn';
import { BlobImage } from '../capture/PhotoStrip';
import { StatusIcon } from '../stones/StatusIcon';
import { photoOrder, rowNeighbours } from './queue';

export interface NeighbourStripProps {
  stone: Monument;
  stones: readonly Monument[];
  /** Stones in the queue can be jumped to; the rest are shown for context only. */
  inQueue: ReadonlySet<ID>;
  onPick: (id: ID) => void;
}

/** Thumbnails of the stones either side in the row (plan §9), for context. */
export function NeighbourStrip({ stone, stones, inQueue, onPick }: NeighbourStripProps) {
  const { t } = useLingui();
  const { before, after } = rowNeighbours(stone, stones);
  if (before.length + after.length === 0) return null;
  return (
    <ul aria-label={t`Neighbours in the row`} className="flex gap-2 overflow-x-auto">
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
