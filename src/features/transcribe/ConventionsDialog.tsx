import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useStore } from '../../app/store-context';
import { CONVENTIONS, conventionOf, type Cemetery, type Convention } from '../../domain';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { RadioGroup } from '../../ui/RadioGroup';

const NAME: Record<string, MessageDescriptor> = {
  'as-carved': msg`As carved (brackets, real line breaks)`,
  'slash-lines': msg`One line, " / " between carved lines`,
  dashes: msg`Dashes for lost text, (?) for doubt`,
};

/** The hint under the desk form, in the cemetery's own marks. */
export function ShortcutHelp({ convention: c }: { convention: Convention }) {
  const illegible = c.illegible;
  const uncertain = c.uncertain;
  return (
    <p className="text-sm text-fg-muted">
      <Trans>
        Enter in a one-line field: save & next. Ctrl+Enter: add another person. Ctrl+.: mark
        uncertain {uncertain}. Ctrl+I: insert {illegible}.
      </Trans>
    </p>
  );
}

/** What each mark means, for the chosen convention (plan §10.5). */
function Reference({ convention: c }: { convention: Convention }) {
  const { t } = useLingui();
  const lines = c.lineBreak === 'slash' ? ' / ' : t`a real line break (Enter)`;
  const rows: [string, string][] = [
    [c.illegible, t`Letters or words that can't be read (Ctrl+I)`],
    [c.uncertain, t`After a letter or word you're unsure of (Ctrl+.)`],
    [c.broken, t`Where the stone is broken off`],
    [c.onBack, t`The text goes on around the back`],
    [lines, t`A new carved line`],
  ];
  return (
    <table className="w-full text-start text-sm">
      <thead>
        <tr>
          <th className="py-1 text-start">
            <Trans>Write</Trans>
          </th>
          <th className="py-1 text-start">
            <Trans>For</Trans>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([mark, meaning]) => (
          <tr key={meaning} className="border-t border-border">
            <td className="py-1 pe-3 font-mono whitespace-pre">{mark}</td>
            <td className="py-1">{meaning}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * "Conventions": the marks this cemetery's transcriptions use, and the choice of preset. The
 * choice is stored on the cemetery; each inscription saved records the one it was typed in.
 */
export function ConventionsButton({ cemetery }: { cemetery: Cemetery }) {
  const { t } = useLingui();
  const store = useStore();
  const [open, setOpen] = useState(false);
  // Shown at once; the stored setting catches up a moment later.
  const [picked, setPicked] = useState<string>();
  const current = conventionOf(picked ?? cemetery.settings.transcriptionConvention);
  const choose = (id: string) => {
    setPicked(id);
    void store.cemeteries.update(cemetery.id, {
      settings: { ...cemetery.settings, transcriptionConvention: id },
    });
  };
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Trans>Conventions</Trans>
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t`Transcription conventions`}
        description={t`Type the inscription exactly as carved: spelling, capitals, abbreviations and line breaks. Use these marks for what the stone doesn't show plainly.`}
      >
        <div className="flex flex-col gap-4">
          <Reference convention={current} />
          <RadioGroup
            legend={t`Marks used in this cemetery`}
            name="convention"
            value={current.id}
            options={CONVENTIONS.map((c) => ({
              value: c.id,
              label: t(NAME[c.id] ?? msg`${c.id}`),
            }))}
            onChange={choose}
          />
          <p className="text-sm text-fg-muted">
            <Trans>
              Exports say which convention was used. Changing it doesn't rewrite inscriptions
              already typed.
            </Trans>
          </p>
        </div>
      </Dialog>
    </>
  );
}
