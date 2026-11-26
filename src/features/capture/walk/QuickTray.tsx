import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useStore } from '../../../app/store-context';
import { setQuickAttributes, setQuickName } from '../../../data/quick';
import type { ID } from '../../../domain';
import { cn } from '../../../ui/cn';
import { AttributeChips, type AttributeGroup } from '../../stones/AttributeChips';
import { QuickName } from './QuickName';

type Group = AttributeGroup | 'name';

export interface QuickTrayProps {
  monumentId: ID;
  /** Surname of the previous stone's quick name, offered as a one-tap suggestion. */
  lastSurname: string | undefined;
  onSurname: (surname: string) => void;
}

/** Quick chips and quick name for the stone just captured (plan §8): one tap each. */
export function QuickTray({ monumentId, lastSurname, onSurname }: QuickTrayProps) {
  const { t } = useLingui();
  const store = useStore();
  const [group, setGroup] = useState<Group>('kind');
  const m = useLiveQuery(() => store.monuments.get(monumentId), [store, monumentId]);
  if (!m) return null;

  const tabs: [Group, string][] = [
    ['kind', t`Type`],
    ['material', t`Material`],
    ['condition', t`Condition`],
    ['flags', t`Flags`],
    ['name', t`Name`],
  ];
  const set = (patch: Parameters<typeof setQuickAttributes>[2]) =>
    void setQuickAttributes(store, monumentId, patch);

  return (
    <div className="flex flex-col gap-2 px-3 py-1" aria-label={t`Stone details`} role="region">
      <div role="tablist" aria-label={t`Detail type`} className="flex gap-1 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={group === id}
            onClick={() => setGroup(id)}
            className={cn(
              'min-h-10 shrink-0 rounded-lg px-3 text-sm',
              group === id ? 'bg-white/25 font-semibold' : 'text-white/80',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {group !== 'name' ? (
        <AttributeChips monument={m} group={group} onPatch={set} tone="dark" />
      ) : null}
      {group === 'name' ? (
        <QuickName
          monumentId={monumentId}
          lastSurname={lastSurname}
          onSave={(text, surname, name) => {
            void setQuickName(store, monumentId, text, name);
            if (surname) onSurname(surname);
          }}
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        <Trans>Saved as you tap.</Trans>
      </p>
    </div>
  );
}
