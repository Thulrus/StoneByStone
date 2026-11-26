import { Trans, useLingui } from '@lingui/react/macro';
import { useRef, useState } from 'react';
import { useStore } from '../../app/store-context';
import { Button } from '../../ui/Button';
import { toast } from '../../ui/toast-store';
import { ensurePersisted } from '../settings/storage';

/** Import a `.sbs`, `.sbs.json`, or v1 `.cem.json` file (plan §20.3). */
export function ImportButton() {
  const { t } = useLingui();
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    // Parsers, schemas, and the v1 converter load on first use, not with the app shell.
    const [{ importFile }, { FormatError }] = await Promise.all([
      import('../../data/import'),
      import('../../data/format/validate'),
    ]);
    for (const file of Array.from(files)) {
      try {
        const r = await importFile(store, file);
        void ensurePersisted();
        toast({
          title: t`Imported ${file.name}`,
          description: t`${r.created} new, ${r.updated} updated, ${r.unchanged} unchanged.`,
          action: { label: t`Undo`, onAction: () => void store.undo() },
        });
        for (const w of r.warnings) toast({ tone: 'error', title: t`Warning`, description: w });
      } catch (e) {
        toast({
          tone: 'error',
          title: t`Could not import ${file.name}`,
          description: e instanceof FormatError ? e.problems.slice(0, 3).join('; ') : String(e),
        });
      }
    }
    setBusy(false);
    if (input.current) input.current.value = '';
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        multiple
        accept=".sbs,.json,application/zip,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="import-input"
        onChange={(e) => void onFiles(e.target.files)}
      />
      <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Trans>Importing…</Trans> : <Trans>Import</Trans>}
      </Button>
    </>
  );
}
