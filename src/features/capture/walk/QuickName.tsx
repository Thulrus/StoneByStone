import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useStore } from '../../../app/store-context';
import { parseName, type ID, type PersonName } from '../../../domain';
import { Button } from '../../../ui/Button';

/**
 * Optional quick name (plan §8): the phone keyboard's mic button does the dictation. The
 * previous stone's surname is offered as a one-tap start, so no typing is needed.
 */
export function QuickName({
  monumentId,
  lastSurname,
  onSave,
}: {
  monumentId: ID;
  lastSurname: string | undefined;
  onSave: (text: string, surname: string | undefined, name?: PersonName) => void;
}) {
  const { t } = useLingui();
  const store = useStore();
  const saved = useLiveQuery(
    async () => (await store.persons.byMonument(monumentId))[0]?.name.asCarved ?? '',
    [store, monumentId],
  );
  const [draft, setDraft] = useState<string>();
  const value = draft ?? saved ?? '';
  const save = (text: string, name?: PersonName) => {
    setDraft(undefined);
    if (text.trim() === (saved ?? '')) return;
    onSave(text, (name ?? parseName(text)).surname, name);
  };
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2">
        <span className="shrink-0">
          <Trans>Name</Trans>
        </span>
        <input
          type="text"
          value={value}
          autoComplete="off"
          enterKeyHint="done"
          placeholder={t`Optional — tap the mic to dictate`}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onBlur={(e) => save(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="min-h-12 min-w-0 flex-1 rounded-lg bg-white px-3 text-lg text-black"
        />
      </label>
      {lastSurname && !value ? (
        <Button
          variant="secondary"
          onClick={() => save(lastSurname, { asCarved: lastSurname, surname: lastSurname })}
        >
          <Trans>Same surname: {lastSurname}</Trans>
        </Button>
      ) : null}
    </div>
  );
}
