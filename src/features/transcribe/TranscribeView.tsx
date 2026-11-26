import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { cemeteryPath } from '../../app/paths';
import { useStore } from '../../app/store-context';
import { saveInscription } from '../../data/transcribe';
import type { Cemetery, ID, Monument, Row } from '../../domain';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/toast-store';
import { StatusIcon } from '../stones/StatusIcon';
import { STATUS_LABEL } from '../stones/labels';
import { FilterSelect } from './FilterSelect';
import { NeighbourStrip } from './NeighbourStrip';
import { PhotoPane } from './PhotoPane';
import { buildQueue, DEFAULT_FILTER, type QueueFilter } from './queue';

export interface TranscribeViewProps {
  cemetery: Cemetery;
  stones: readonly Monument[];
  rows: readonly Row[];
  labelOf: (r: Row) => string;
  initialStoneId?: ID;
}

/**
 * Desk mode (plan §9): a queue of stones, the photo large, neighbours for context, and the
 * form. Moving on saves what was typed; the move doesn't wait for the save.
 */
export function TranscribeView({
  cemetery,
  stones,
  rows,
  labelOf,
  initialStoneId,
}: TranscribeViewProps) {
  const { t } = useLingui();
  const store = useStore();
  const [, setParams] = useSearchParams();
  const byId = useMemo(() => new Map(stones.map((m) => [m.id, m])), [stones]);
  const [filter, setFilterState] = useState<QueueFilter>(() =>
    initialStoneId && byId.get(initialStoneId)?.status !== DEFAULT_FILTER ? 'all' : DEFAULT_FILTER,
  );
  // A snapshot, so a stone saved as transcribed keeps its place in this session's list.
  const [ids, setIds] = useState(() => buildQueue(stones, rows, filter));
  const queued = useMemo(() => new Set(ids), [ids]);
  const [currentId, setCurrentId] = useState<ID | undefined>(() =>
    initialStoneId && ids.includes(initialStoneId) ? initialStoneId : ids[0],
  );
  const current = currentId ? byId.get(currentId) : undefined;
  const [draft, setDraft] = useState(current?.inscription?.text ?? '');
  const saving = useRef(Promise.resolve());
  const textArea = useRef<HTMLTextAreaElement>(null);
  const pos = currentId ? ids.indexOf(currentId) : -1;

  useEffect(() => {
    textArea.current?.focus();
  }, [currentId]);

  const save = () => {
    if (!current) return;
    const id = current.id;
    const text = draft;
    saving.current = saving.current
      .then(() => saveInscription(store, id, text))
      .catch(() => {
        toast({ title: t`Couldn't save that stone`, tone: 'error' });
      });
  };

  /** Save, then show `id` (or the end of the list). */
  const goTo = (id: ID | undefined) => {
    save();
    setCurrentId(id);
    setDraft((id && byId.get(id)?.inscription?.text) || '');
    setParams(id ? { stone: id } : {}, { replace: true });
  };

  const setFilter = (f: QueueFilter) => {
    save();
    const next = buildQueue(stones, rows, f);
    setFilterState(f);
    setIds(next);
    const keep = currentId && next.includes(currentId) ? currentId : next[0];
    setCurrentId(keep);
    setDraft((keep && byId.get(keep)?.inscription?.text) || '');
  };

  const row = rows.find((r) => r.id === current?.address?.rowId);
  const rowName = row ? labelOf(row) : '';
  const index = current?.address?.rowIndex;
  const n = (index ?? 0) + 1;
  const where = row
    ? index === undefined
      ? t`Row ${rowName}`
      : t`Row ${rowName}, stone ${n}`
    : t`Stone`;
  const position = pos + 1;
  const total = ids.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link to={cemeteryPath(cemetery.id)} className="text-primary underline">
            <Trans>Back to {cemetery.name}</Trans>
          </Link>
          <h1 className="text-2xl font-bold">
            <Trans>Transcribe</Trans>
          </h1>
        </div>
        <FilterSelect value={filter} onChange={setFilter} />
      </div>
      {total === 0 ? (
        <p>
          <Trans>No stones in this list. Choose another list above.</Trans>
        </p>
      ) : !current ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-lg">
            <Trans>That's the end of the list.</Trans>
          </p>
          <Button onClick={() => goTo(ids[0])}>
            <Trans>Back to the first stone</Trans>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
          <div className="flex min-w-0 flex-col gap-3">
            <PhotoPane key={current.id} monumentId={current.id} />
            <NeighbourStrip stone={current} stones={stones} inQueue={queued} onPick={goTo} />
          </div>
          <form
            aria-label={t`Transcription`}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              goTo(ids[pos + 1]);
            }}
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">{where}</h2>
              <p className="flex items-center gap-2 text-fg-muted">
                <StatusIcon status={current.status} />
                {t(STATUS_LABEL[current.status])} ·{' '}
                <Trans>
                  {position} of {total}
                </Trans>
              </p>
            </div>
            <label className="flex flex-col gap-1">
              <span className="font-medium">
                <Trans>Inscription, as carved</Trans>
              </span>
              <textarea
                ref={textArea}
                value={draft}
                rows={8}
                spellCheck={false}
                onChange={(e) => setDraft(e.currentTarget.value)}
                className="rounded-lg bg-surface p-3 font-mono text-base text-fg sbs-border"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg">
                <Trans>Save & next</Trans>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                disabled={pos <= 0}
                onClick={() => goTo(ids[pos - 1])}
              >
                <Trans>Previous</Trans>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
