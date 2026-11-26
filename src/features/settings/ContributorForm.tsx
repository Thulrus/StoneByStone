import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useStore } from '../../app/store-context';
import { currentContributor, updateContributor } from '../../data/settings';
import type { Contributor } from '../../domain';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { toast } from '../../ui/toast-store';

/** The name (and optional contact) recorded on everything this device writes. */
export function ContributorForm() {
  const store = useStore();
  const me = useLiveQuery(() => currentContributor(store), [store]);
  if (!me) return null;
  return <Form key={`${me.displayName}\u0000${me.contact ?? ''}`} me={me} />;
}

function Form({ me }: { me: Contributor }) {
  const { t } = useLingui();
  const store = useStore();
  const [name, setName] = useState(me.displayName);
  const [contact, setContact] = useState(me.contact ?? '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await updateContributor(store, { displayName: name, contact });
    toast({ title: t`Saved` });
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">
        <Trans>Your name</Trans>
      </h2>
      <Field
        label={t`Name`}
        hint={t`Recorded on every stone and photo you add, so merged datasets show who did what.`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
      />
      <Field
        label={t`Contact (optional)`}
        hint={t`Email or phone, included when you share a file.`}
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        autoComplete="email"
      />
      <div>
        <Button type="submit">
          <Trans>Save name</Trans>
        </Button>
      </div>
    </form>
  );
}
