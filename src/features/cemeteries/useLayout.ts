import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../../app/store-context';
import { listRows, listSections, rowStoneCounts } from '../../data/layout';
import type { ID, Row, Section } from '../../domain';

export interface Layout {
  sections: Section[];
  /** All live rows: sections in order, then their rows in order; unsectioned first. */
  rows: Row[];
  rowsBySection: Map<ID | null, Row[]>;
  counts: Map<ID, number>;
  /** "A · 3" for a row in section A, else just the row label. */
  labelOf: (r: Row) => string;
}

/** Live sections and rows of a cemetery; `undefined` while loading. */
export function useLayout(cemeteryId: ID): Layout | undefined {
  const store = useStore();
  return useLiveQuery(async () => {
    const [sections, all, counts] = await Promise.all([
      listSections(store, cemeteryId),
      listRows(store, cemeteryId),
      rowStoneCounts(store, cemeteryId),
    ]);
    const names = new Map(sections.map((s) => [s.id, s.name]));
    const rowsBySection = new Map<ID | null, Row[]>([[null, []]]);
    for (const s of sections) rowsBySection.set(s.id, []);
    for (const r of all) {
      const key = r.sectionId && names.has(r.sectionId) ? r.sectionId : null;
      rowsBySection.get(key)?.push(r);
    }
    const rows = [...rowsBySection.values()].flat();
    const labelOf = (r: Row) => {
      const s = r.sectionId ? names.get(r.sectionId) : undefined;
      return s ? `${s} · ${r.label}` : r.label;
    };
    return { sections, rows, rowsBySection, counts, labelOf };
  }, [store, cemeteryId]);
}
