import { useMemo } from 'react';
import { matchedItems } from '../../../data/index-match';
import {
  isIndexRecord,
  type ID,
  type Monument,
  type Person,
  type StoneContext,
} from '../../../domain';
import type { Layout } from '../../cemeteries/useLayout';
import { compareByName } from '../search';

/** What the Match view works from, derived from live data. */
export function useMatchData(
  layout: Layout,
  stones: readonly Monument[],
  people: readonly Person[],
) {
  return useMemo(() => {
    const live = people.filter((p) => !p.deleted);
    const peopleByStone = new Map<ID, Person[]>();
    for (const p of live) {
      if (!p.monumentId) continue;
      const list = peopleByStone.get(p.monumentId) ?? [];
      list.push(p);
      peopleByStone.set(p.monumentId, list);
    }
    const sectionName = new Map(layout.sections.map((s) => [s.id, s.name]));
    const rowById = new Map(layout.rows.map((r) => [r.id, r]));
    const contexts: StoneContext[] = stones
      .filter((m) => !m.deleted)
      .map((stone) => {
        const row = stone.address?.rowId ? rowById.get(stone.address.rowId) : undefined;
        const sectionId = stone.address?.sectionId ?? row?.sectionId;
        return {
          stone,
          people: peopleByStone.get(stone.id) ?? [],
          section: sectionId ? sectionName.get(sectionId) : undefined,
          row: row?.label,
        };
      });
    const records = live.filter((p) => isIndexRecord(p) && !p.monumentId);
    const toMatch = records.filter((p) => p.matchStatus !== 'no-stone-found').sort(compareByName);
    const noStone = records.filter((p) => p.matchStatus === 'no-stone-found').sort(compareByName);
    const matched = matchedItems(people).sort((a, b) => compareByName(a.record, b.record));
    return { contexts, toMatch, noStone, matched };
  }, [layout, stones, people]);
}
