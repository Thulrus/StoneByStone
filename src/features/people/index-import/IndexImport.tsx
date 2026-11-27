import { Plural, Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../../app/store-context';
import { parseCsv } from '../../../data/format/csv';
import {
  guessMapping,
  indexRowsToPeople,
  mappingFromPreset,
  type ColumnMapping,
  type IndexPreset,
} from '../../../data/format/index-csv';
import { importIndexPeople, listIndexPresets } from '../../../data/index-import';
import type { Cemetery } from '../../../domain';
import { Button } from '../../../ui/Button';
import { toast } from '../../../ui/toast-store';
import { ColumnMapper } from './ColumnMapper';
import { ImportOptions } from './ImportOptions';
import { PeoplePreview } from './PeoplePreview';

interface Loaded {
  fileName: string;
  rows: string[][];
}

/**
 * Import a burial index from a historical society, church register or card file (plan §11):
 * pick a CSV, say what each column holds (guessed from the headers, or a saved preset), check
 * the people it will make, import as one undoable step.
 */
export function IndexImport({ cemetery, onDone }: { cemetery: Cemetery; onDone: () => void }) {
  const { t } = useLingui();
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const presets = useLiveQuery(() => listIndexPresets(store), [store]) ?? [];
  const [file, setFile] = useState<Loaded>();
  const [hasHeader, setHasHeader] = useState(true);
  const [dateLocale, setDateLocale] = useState(cemetery.settings.dateLocale);
  const [mapping, setMapping] = useState<ColumnMapping>([]);
  const [busy, setBusy] = useState(false);

  const width = file ? Math.max(0, ...file.rows.map((r) => r.length)) : 0;
  const headers = useMemo(() => {
    const first = file?.rows[0] ?? [];
    return Array.from({ length: width }, (_, i) =>
      hasHeader ? (first[i] ?? '') : t`Column ${i + 1}`,
    );
  }, [file, width, hasHeader, t]);
  const dataRows = useMemo(
    () => (file ? file.rows.slice(hasHeader ? 1 : 0) : []),
    [file, hasHeader],
  );
  const result = useMemo(
    () =>
      file
        ? indexRowsToPeople(dataRows, mapping, {
            cemeteryId: cemetery.id,
            fileName: file.fileName,
            dateLocale,
            firstLine: hasHeader ? 2 : 1,
          })
        : undefined,
    [file, dataRows, mapping, cemetery.id, dateLocale, hasHeader],
  );

  const load = async (f: File | undefined) => {
    if (!f) return;
    const rows = parseCsv(await f.text());
    if (rows.length === 0) {
      toast({ tone: 'error', title: t`${f.name} has no rows` });
      return;
    }
    const first = rows[0] ?? [];
    // A header row names at least two things we know; a data row rarely does.
    const header = guessMapping(first).filter((x) => x !== 'ignore').length >= 2;
    // Read fresh: the live list may not have loaded yet when a file is picked straight away.
    const preset = bestPreset(await listIndexPresets(store), first);
    setFile({ fileName: f.name, rows });
    setHasHeader(preset?.hasHeader ?? header);
    if (preset) {
      setMapping(mappingFromPreset(preset, first));
      setDateLocale(preset.dateLocale);
    } else {
      setMapping(header ? guessMapping(first) : first.map(() => 'ignore'));
    }
  };

  const applyPreset = (p: IndexPreset) => {
    setHasHeader(p.hasHeader);
    setDateLocale(p.dateLocale);
    setMapping(mappingFromPreset(p, file?.rows[0] ?? []));
  };

  const run = async () => {
    if (!file || !result) return;
    setBusy(true);
    try {
      const n = await importIndexPeople(store, result.people, t`Import ${file.fileName}`);
      toast({
        title: t`Imported ${file.fileName}`,
        description: t`${n} people added, not yet matched to stones.`,
        action: { label: t`Undo`, onAction: () => void store.undo() },
      });
      onDone();
    } catch (e) {
      toast({ tone: 'error', title: t`Could not import ${file.fileName}`, description: String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="index-import" className="flex min-w-0 flex-col gap-4">
      <h2 id="index-import" className="text-xl font-semibold">
        <Trans>Import a burial index</Trans>
      </h2>
      <input
        ref={input}
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="index-input"
        onChange={(e) => {
          void load(e.currentTarget.files?.[0]);
          e.currentTarget.value = '';
        }}
      />
      {!file ? (
        <div className="flex flex-col items-start gap-3">
          <p className="max-w-prose">
            <Trans>
              A list of burials from a historical society, a church register or a card file, saved
              as CSV from a spreadsheet. Each row becomes a person with no stone yet; match them to
              stones later. Rows left over may be unmarked or lost graves.
            </Trans>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => input.current?.click()}>
              <Trans>Choose a CSV file</Trans>
            </Button>
            <Button variant="ghost" onClick={onDone}>
              <Trans>Cancel</Trans>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p>
            <span className="font-medium">{file.fileName}</span> ·{' '}
            <Plural value={dataRows.length} one="# row" other="# rows" />
          </p>
          <ImportOptions
            hasHeader={hasHeader}
            onHasHeader={setHasHeader}
            dateLocale={dateLocale}
            onDateLocale={setDateLocale}
            presets={presets}
            onPreset={applyPreset}
            headers={headers}
            mapping={mapping}
          />
          <ColumnMapper headers={headers} rows={dataRows} mapping={mapping} onChange={setMapping} />
          {result ? <PeoplePreview result={result} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !result?.people.length} onClick={() => void run()}>
              {result?.people.length ? (
                <Plural
                  value={result.people.length}
                  one="Import # person"
                  other="Import # people"
                />
              ) : (
                <Trans>Nothing to import</Trans>
              )}
            </Button>
            <Button variant="secondary" onClick={() => input.current?.click()}>
              <Trans>Choose another file</Trans>
            </Button>
            <Button variant="ghost" onClick={onDone}>
              <Trans>Cancel</Trans>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

/** The saved preset that knows most of these headers (at least half), if any. */
function bestPreset(presets: readonly IndexPreset[], first: readonly string[]) {
  let best: IndexPreset | undefined;
  let bestHits = 0;
  for (const p of presets) {
    const hits = mappingFromPreset(p, first).filter((f) => f !== 'ignore').length;
    if (hits > bestHits && hits * 2 >= Object.keys(p.byHeader).length) {
      best = p;
      bestHits = hits;
    }
  }
  return best;
}
