import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { useStore } from '../../../app/store-context';
import { addSection } from '../../../data/layout';
import type { ID, Row, Section } from '../../../domain';
import { Button } from '../../../ui/Button';
import { Field } from '../../../ui/Field';
import { SectionBlock } from './SectionBlock';

export interface LayoutEditorProps {
  cemeteryId: ID;
  sections: readonly Section[];
  /** Rows grouped by section id; `null` for unsectioned. */
  rowsBySection: ReadonlyMap<ID | null, Row[]>;
  counts: ReadonlyMap<ID, number>;
  activeRowId?: ID;
  onSelectRow: (id: ID) => void;
  onDrawRow: (id: ID) => void;
}

/** Setup: sections and rows (plan §7.2). Sections are optional. */
export function LayoutEditor(props: LayoutEditorProps) {
  const { cemeteryId, sections, rowsBySection } = props;
  const { t } = useLingui();
  const store = useStore();
  const [name, setName] = useState('');
  const unsectioned = rowsBySection.get(null) ?? [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addSection(store, cemeteryId, name);
    setName('');
  };

  const block = (section: Section | null, i = 0) => (
    <SectionBlock
      key={section?.id ?? 'none'}
      cemeteryId={cemeteryId}
      section={section}
      first={i === 0}
      last={i === sections.length - 1}
      rows={rowsBySection.get(section?.id ?? null) ?? []}
      sections={sections}
      counts={props.counts}
      activeRowId={props.activeRowId}
      onSelectRow={props.onSelectRow}
      onDrawRow={props.onDrawRow}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-fg-muted">
        <Trans>
          Add the rows you will walk. Sections are optional; use them if the cemetery has named or
          lettered areas. Draw each row's line on the map, or do it later.
        </Trans>
      </p>
      {sections.length === 0 || unsectioned.length > 0 ? block(null) : null}
      {sections.map((s, i) => block(s, i))}
      <form onSubmit={(e) => void submit(e)} className="flex flex-wrap items-end gap-2">
        <Field
          className="flex-1"
          label={t`New section`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={!name.trim()}>
          <Trans>Add section</Trans>
        </Button>
      </form>
    </div>
  );
}
