import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { cemeteryPath } from '../../app/paths';
import { useStore } from '../../app/store-context';
import { createCemetery } from '../../data/cemeteries';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { Field } from '../../ui/Field';
import { ensurePersisted } from '../settings/storage';

/** Create a cemetery by name. Map search and boundaries come with M2. */
export function NewCemeteryButton() {
  const { t } = useLingui();
  const store = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t`Enter a name.`);
      return;
    }
    const cem = await createCemetery(store, name);
    void ensurePersisted();
    setOpen(false);
    setName('');
    void navigate(cemeteryPath(cem.id));
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Trans>New cemetery</Trans>
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={t`New cemetery`}>
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
          <Field
            label={t`Name`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(undefined);
            }}
            error={error}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button type="submit">
              <Trans>Create</Trans>
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
