import { useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../../app/store-context';
import { unlinkPeople } from '../../data/people';
import type { ID } from '../../domain';
import { Button } from '../../ui/Button';
import { personLabel } from './candidates';
import { RELATION_LABEL } from './relation-labels';

/** A person's structured links, each removable (plan §10.3). */
export function RelationsList({
  personId,
  whereOf,
}: {
  personId: ID;
  whereOf: (monumentId: ID | undefined) => string;
}) {
  const { t } = useLingui();
  const store = useStore();
  const links = useLiveQuery(async () => {
    const p = await store.persons.get(personId);
    const out = [];
    for (const r of p?.relations ?? []) {
      const other = await store.persons.get(r.personId);
      if (other) out.push({ type: r.type, other });
    }
    return out;
  }, [store, personId]);
  if (!links?.length) return null;
  return (
    <ul aria-label={t`Linked people`} className="flex flex-col gap-1">
      {links.map(({ type, other }) => {
        const rel = t(RELATION_LABEL[type]);
        const name = personLabel(other);
        return (
          <li key={other.id} className="flex flex-wrap items-center gap-2">
            <span>
              {rel}: <span className="font-medium">{name}</span>{' '}
              <span className="text-sm text-fg-muted">({whereOf(other.monumentId)})</span>
            </span>
            <Button
              variant="ghost"
              aria-label={t`Unlink ${name}`}
              onClick={() => void unlinkPeople(store, personId, other.id)}
            >
              {t`Unlink`}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
