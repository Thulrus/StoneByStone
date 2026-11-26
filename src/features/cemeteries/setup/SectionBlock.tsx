import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useStore } from '../../../app/store-context';
import { moveSection } from '../../../data/layout';
import type { ID, Row, Section } from '../../../domain';
import { Button } from '../../../ui/Button';
import { toast } from '../../../ui/toast-store';
import { AddRowsForm } from './AddRowsForm';
import { RowItem } from './RowItem';
import { TextPrompt } from './TextPrompt';

export interface SectionBlockProps {
  cemeteryId: ID;
  /** `null` for rows without a section. */
  section: Section | null;
  first?: boolean;
  last?: boolean;
  rows: readonly Row[];
  sections: readonly Section[];
  counts: ReadonlyMap<ID, number>;
  activeRowId?: ID;
  onSelectRow: (id: ID) => void;
  onDrawRow: (id: ID) => void;
}

export function SectionBlock(props: SectionBlockProps) {
  const { cemeteryId, section, rows, sections, counts, activeRowId } = props;
  const { t } = useLingui();
  const store = useStore();
  const [renaming, setRenaming] = useState(false);

  const remove = async () => {
    if (!section) return;
    await store.sections.delete(section.id);
    toast({
      title: t`Deleted section ${section.name}. Its rows are now unsectioned.`,
      action: { label: t`Undo`, onAction: () => void store.undo() },
    });
  };

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="flex-1 text-lg font-semibold">
          {section ? section.name : <Trans>Rows without a section</Trans>}
        </h3>
        {section ? (
          <>
            <Button
              variant="ghost"
              aria-label={t`Move section ${section.name} up`}
              disabled={props.first}
              onClick={() => void moveSection(store, cemeteryId, section.id, -1)}
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              aria-label={t`Move section ${section.name} down`}
              disabled={props.last}
              onClick={() => void moveSection(store, cemeteryId, section.id, 1)}
            >
              ↓
            </Button>
            <Button variant="ghost" onClick={() => setRenaming(true)}>
              <Trans>Rename</Trans>
            </Button>
            <Button variant="ghost" onClick={() => void remove()}>
              <Trans>Delete</Trans>
            </Button>
          </>
        ) : null}
      </header>
      {rows.length > 0 ? (
        <ul className="flex flex-col">
          {rows.map((r, i) => (
            <RowItem
              key={r.id}
              row={r}
              sections={sections}
              stones={counts.get(r.id) ?? 0}
              first={i === 0}
              last={i === rows.length - 1}
              active={r.id === activeRowId}
              onSelect={props.onSelectRow}
              onDraw={props.onDrawRow}
            />
          ))}
        </ul>
      ) : null}
      <AddRowsForm
        cemeteryId={cemeteryId}
        sectionId={section?.id ?? null}
        lastLabel={rows[rows.length - 1]?.label}
      />
      {renaming && section ? (
        <TextPrompt
          title={t`Rename section`}
          label={t`Section name`}
          initial={section.name}
          onSubmit={(name) => void store.sections.update(section.id, { name })}
          onClose={() => setRenaming(false)}
        />
      ) : null}
    </section>
  );
}
