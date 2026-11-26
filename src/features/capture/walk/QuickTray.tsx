import type { MessageDescriptor } from '@lingui/core';
import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useStore } from '../../../app/store-context';
import { setQuickAttributes, setQuickName } from '../../../data/quick';
import {
  CAPTURE_FLAGS,
  CONDITIONS,
  DEFAULT_KIND,
  MATERIALS,
  MONUMENT_KINDS,
  toggleIn,
  type ID,
} from '../../../domain';
import { cn } from '../../../ui/cn';
import {
  CONDITION_LABEL,
  FLAG_LABEL,
  KIND_LABEL,
  MATERIAL_LABEL,
} from '../../stones/attribute-labels';
import { QuickName } from './QuickName';

type Group = 'kind' | 'material' | 'condition' | 'flags' | 'name';

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

  const chips = (
    ids: readonly string[],
    labels: Record<string, MessageDescriptor>,
    on: (id: string) => boolean,
    tap: (id: string) => void,
  ) => (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t`Choices`}>
      {ids.map((id) => {
        const pressed = on(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={pressed}
            onClick={() => tap(id)}
            className={cn(
              'min-h-12 shrink-0 rounded-full px-4 text-base',
              pressed ? 'bg-white font-semibold text-black' : 'border border-white/60',
            )}
          >
            {pressed ? <span aria-hidden="true">✓ </span> : null}
            {labels[id] ? t(labels[id]) : id}
          </button>
        );
      })}
    </div>
  );

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
      {group === 'kind'
        ? chips(
            MONUMENT_KINDS,
            KIND_LABEL,
            (id) => m.kind === id,
            (id) => set({ kind: m.kind === id && id !== DEFAULT_KIND ? DEFAULT_KIND : id }),
          )
        : group === 'material'
          ? chips(
              MATERIALS,
              MATERIAL_LABEL,
              (id) => m.material === id,
              (id) => set({ material: m.material === id ? undefined : id }),
            )
          : group === 'condition'
            ? chips(
                CONDITIONS,
                CONDITION_LABEL,
                (id) => m.condition?.includes(id) ?? false,
                (id) => set({ condition: orNone(toggleIn(m.condition, id, CONDITIONS)) }),
              )
            : group === 'flags'
              ? chips(
                  CAPTURE_FLAGS,
                  FLAG_LABEL,
                  (id) => m.flags?.includes(id) ?? false,
                  (id) => set({ flags: orNone(toggleIn(m.flags, id, CAPTURE_FLAGS)) }),
                )
              : null}
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

const orNone = (xs: string[]) => (xs.length ? xs : undefined);
