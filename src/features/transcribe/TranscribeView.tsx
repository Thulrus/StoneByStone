import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { cemeteryPath } from '../../app/paths';
import { useStore } from '../../app/store-context';
import { saveTranscription, type TranscriptionDraft } from '../../data/transcribe';
import { conventionOf, type Cemetery, type ID, type Monument, type Row } from '../../domain';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/toast-store';
import { StatusIcon } from '../stones/StatusIcon';
import { useStoneLabel } from '../stones/useStoneLabel';
import { STATUS_LABEL } from '../stones/labels';
import { ConventionsButton } from './ConventionsDialog';
import { FilterSelect } from './FilterSelect';
import { NeighbourStrip } from './NeighbourStrip';
import { PhotoPane } from './PhotoPane';
import { TranscribeForm } from './TranscribeForm';
import { useNameSuggestions } from './useNameSuggestions';
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
  const stoneLabel = useStoneLabel(rows, labelOf);
  const suggestNames = useNameSuggestions(cemetery.id);
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
  // The open stone's edits, if any; read when moving away by any route.
  const draft = useRef<TranscriptionDraft | undefined>(undefined);
  const saving = useRef<Promise<Record<ID, ID>>>(Promise.resolve({}));
  const pos = currentId ? ids.indexOf(currentId) : -1;

  const save = (): Promise<Record<ID, ID>> => {
    const d = draft.current;
    if (!current || !d) return saving.current;
    const id = current.id;
    saving.current = saving.current
      .then(() => saveTranscription(store, id, d))
      .catch(() => {
        toast({ title: t`Couldn't save that stone`, tone: 'error' });
        return {};
      });
    return saving.current;
  };

  /** Save, then show `id` (or the end of the list). */
  const goTo = (id: ID | undefined) => {
    void save();
    draft.current = undefined;
    setCurrentId(id);
    setParams(id ? { stone: id } : {}, { replace: true });
  };

  const setFilter = (f: QueueFilter) => {
    void save();
    draft.current = undefined;
    const next = buildQueue(stones, rows, f);
    setFilterState(f);
    setIds(next);
    const keep = currentId && next.includes(currentId) ? currentId : next[0];
    setCurrentId(keep);
  };

  const where = stoneLabel(current);
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
        <div className="flex flex-wrap items-end gap-2">
          <ConventionsButton cemetery={cemetery} />
          <FilterSelect value={filter} onChange={setFilter} />
        </div>
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
          <TranscribeForm
            key={current.id}
            stone={current}
            canPrevious={pos > 0}
            dateLocale={cemetery.settings.dateLocale}
            convention={conventionOf(cemetery.settings.transcriptionConvention)}
            suggestNames={suggestNames}
            onDraft={(d) => (draft.current = d)}
            whereOf={(id) => stoneLabel(id ? byId.get(id) : undefined)}
            onNext={() => goTo(ids[pos + 1])}
            onPrevious={() => goTo(ids[pos - 1])}
            onSaveNow={(d) => {
              draft.current = d;
              const done = save();
              draft.current = undefined;
              return done;
            }}
            header={
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
            }
          />
        </div>
      )}
    </div>
  );
}
