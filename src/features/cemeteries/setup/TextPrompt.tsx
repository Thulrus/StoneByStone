import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { Button } from '../../../ui/Button';
import { Dialog } from '../../../ui/Dialog';
import { Field } from '../../../ui/Field';

export interface TextPromptProps {
  title: string;
  label: string;
  initial: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

/** A one-field dialog, for renaming. Rendered only while open. */
export function TextPrompt({ title, label, initial, onSubmit, onClose }: TextPromptProps) {
  const { t } = useLingui();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string>();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setError(t`Enter a name.`);
      return;
    }
    onSubmit(value.trim());
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={title}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field
          label={label}
          value={value}
          error={error}
          autoFocus
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="submit">
            <Trans>Save</Trans>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
