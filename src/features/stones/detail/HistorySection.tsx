import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../../../app/store-context';
import { entityHistory } from '../../../data/history';
import { parseHlc, type ID } from '../../../domain';
import { OP_LABEL } from './labels';

/** Who changed what on this stone, its people and its photos, newest first (plan §14). */
export function HistorySection({ monumentId }: { monumentId: ID }) {
  const { t, i18n } = useLingui();
  const store = useStore();
  const entries = useLiveQuery(async () => {
    const [persons, photos] = await Promise.all([
      store.persons.byMonument(monumentId),
      store.photos.byMonument(monumentId),
    ]);
    const ids = [monumentId, ...[...persons, ...photos].map((r) => r.id)];
    const all = (await Promise.all(ids.map((id) => entityHistory(store.db, id)))).flat();
    const who = new Map((await store.db.contributors.toArray()).map((c) => [c.id, c.displayName]));
    return all.sort((a, b) => (a.at < b.at ? 1 : -1)).map((e) => ({ ...e, who: who.get(e.by) }));
  }, [store, monumentId]);
  const what: Record<string, string> = {
    monument: t`stone`,
    person: t`person`,
    photo: t`photo`,
  };
  const fmt = new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <section aria-labelledby="stone-history" className="flex flex-col gap-3">
      <h2 id="stone-history" className="text-xl font-semibold">
        <Trans>History</Trans>
      </h2>
      <ol className="flex flex-col gap-2" aria-label={t`Changes`}>
        {(entries ?? []).map((e) => {
          const fields = Object.keys(e.fields ?? {})
            .filter((k) => k !== 'status')
            .join(', ');
          return (
            <li key={e.id} className="flex flex-col">
              <span>
                {t(OP_LABEL[e.op])} {what[e.entityType] ?? e.entityType}
                {fields ? <span className="text-fg-muted">: {fields}</span> : null}
              </span>
              <span className="text-sm text-fg-muted">
                {fmt.format(parseHlc(e.at).wall)}
                {e.who ? ` · ${e.who}` : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
