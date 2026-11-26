import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { useStore } from '../../app/store-context';
import {
  currentContributor,
  getSetting,
  ONBOARDED_KEY,
  setSetting,
  updateContributor,
} from '../../data/settings';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';

/** First launch: ask who is surveying, so every write carries a name (plan §19). */
export function WelcomeCard() {
  const { t } = useLingui();
  const store = useStore();
  const show = useLiveQuery(async () => {
    if (await getSetting(store, ONBOARDED_KEY, false)) return false;
    return (await currentContributor(store)).displayName === '';
  }, [store]);
  const [name, setName] = useState('');

  if (!show) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) await updateContributor(store, { displayName: name });
  };

  return (
    <section
      aria-labelledby="welcome-heading"
      className="flex flex-col gap-3 rounded-xl bg-surface p-4 sbs-border"
    >
      <h2 id="welcome-heading" className="text-lg font-semibold">
        <Trans>Welcome! What’s your name?</Trans>
      </h2>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        <Field
          label={t`Name`}
          hint={t`Saved with every stone you record, so others can see who did the work when datasets are combined. You can change it in Settings.`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!name.trim()}>
            <Trans>Save</Trans>
          </Button>
          <Button variant="ghost" onClick={() => void setSetting(store, ONBOARDED_KEY, true)}>
            <Trans>Not now</Trans>
          </Button>
        </div>
      </form>
    </section>
  );
}
