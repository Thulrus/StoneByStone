import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../../../app/store-context';
import { walkSummary } from '../../../data/walk-summary';
import type { HLC, Row } from '../../../domain';
import { Button } from '../../../ui/Button';
import { Sheet } from '../../../ui/Sheet';
import { formatBytes, storageEstimate } from '../../settings/storage';
import { BackupBanner } from '../../share/BackupBanner';

export interface WalkSummaryProps {
  open: boolean;
  row: Row;
  rowName: string;
  since: HLC;
  rowEnded: boolean;
  onDone: () => void;
}

/** End-of-walk summary with a backup reminder (plan §8). */
export function WalkSummary({ open, row, rowName, since, rowEnded, onDone }: WalkSummaryProps) {
  const { t, i18n } = useLingui();
  const store = useStore();
  const data = useLiveQuery(
    async () =>
      open
        ? { summary: await walkSummary(store, row, since), quota: await storageEstimate() }
        : undefined,
    [store, row.id, row.cemeteryId, since, open],
  );
  const s = data?.summary;
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onDone();
      }}
      title={t`Row ${rowName} done`}
      actions={
        <Button size="lg" onClick={onDone}>
          <Trans>Done</Trans>
        </Button>
      }
    >
      {s ? (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-1 text-lg" aria-label={t`This walk`}>
            <li>
              <Plural value={s.stones} one="# stone captured" other="# stones captured" />
            </li>
            <li>
              <Plural value={s.photos} one="# photo" other="# photos" />
            </li>
            {s.skipped > 0 ? (
              <li>
                <Plural
                  value={s.skipped}
                  one="# skipped (flagged to revisit)"
                  other="# skipped (flagged to revisit)"
                />
              </li>
            ) : null}
            <li>{rowEnded ? <Trans>Row end set</Trans> : <Trans>Row end not set</Trans>}</li>
            {data.quota ? (
              <li className="text-base text-fg-muted">
                <Trans>
                  Storage used on this device: {formatBytes(data.quota.usage, i18n.locale)}
                </Trans>
              </li>
            ) : null}
          </ul>
          <BackupBanner />
        </div>
      ) : null}
    </Sheet>
  );
}
