/**
 * Sections and rows of a cemetery (plan §7.2): ordered lists, bulk add, rename, reorder.
 * Rows without a section belong to the cemetery directly.
 */
import { compareLabels, type ID, type Row, type Section } from '../domain';
import type { Store } from './store';

function byOrder<T extends { order?: number }>(label: (t: T) => string) {
  return (a: T, b: T) =>
    (a.order ?? Infinity) - (b.order ?? Infinity) || compareLabels(label(a), label(b));
}

export async function listSections(store: Store, cemeteryId: ID): Promise<Section[]> {
  const all = await store.sections.listByCemetery(cemeteryId);
  return all.sort(byOrder((s) => s.name));
}

/** Live rows of the cemetery, ordered, optionally restricted to one section (`null` = none). */
export async function listRows(
  store: Store,
  cemeteryId: ID,
  sectionId?: ID | null,
): Promise<Row[]> {
  const all = await store.rows.listByCemetery(cemeteryId);
  const live = await liveSectionIds(store, cemeteryId);
  return all
    .filter((r) => {
      // A row in a deleted section shows as unsectioned rather than disappearing.
      const sid = r.sectionId && live.has(r.sectionId) ? r.sectionId : null;
      return sectionId === undefined || sid === sectionId;
    })
    .sort(byOrder((r) => r.label));
}

async function liveSectionIds(store: Store, cemeteryId: ID): Promise<Set<ID>> {
  return new Set((await store.sections.listByCemetery(cemeteryId)).map((s) => s.id));
}

function nextOrder(items: readonly { order?: number }[]): number {
  return items.reduce((m, i) => Math.max(m, i.order ?? -1), -1) + 1;
}

export async function addSection(store: Store, cemeteryId: ID, name: string): Promise<Section> {
  const existing = await listSections(store, cemeteryId);
  return store.sections.create({ cemeteryId, name: name.trim(), order: nextOrder(existing) });
}

/** Add rows with these labels at the end of a section (or of the unsectioned rows). */
export async function addRows(
  store: Store,
  cemeteryId: ID,
  sectionId: ID | null,
  labels: readonly string[],
): Promise<Row[]> {
  return store.run(labels.length === 1 ? 'Add row' : 'Add rows', async () => {
    const existing = await listRows(store, cemeteryId, sectionId);
    let order = nextOrder(existing);
    const out: Row[] = [];
    for (const label of labels) {
      out.push(
        await store.rows.create({
          cemeteryId,
          label: label.trim(),
          order: order++,
          ...(sectionId ? { sectionId } : {}),
        }),
      );
    }
    return out;
  });
}

/** Rewrite `order` as 0…n-1 after moving `ids[from]` to `to`; only changed records are written. */
async function reorder<T extends { id: ID; order?: number }>(
  items: readonly T[],
  from: number,
  to: number,
  write: (id: ID, order: number) => Promise<unknown>,
): Promise<void> {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (!moved) return;
  next.splice(to, 0, moved);
  for (const [i, item] of next.entries()) if (item.order !== i) await write(item.id, i);
}

export async function moveSection(store: Store, cemeteryId: ID, id: ID, by: -1 | 1) {
  await store.run('Reorder sections', async () => {
    const list = await listSections(store, cemeteryId);
    const i = list.findIndex((s) => s.id === id);
    await reorder(list, i, i + by, (sid, order) => store.sections.update(sid, { order }));
  });
}

export async function moveRow(store: Store, row: Row, by: -1 | 1) {
  await store.run('Reorder rows', async () => {
    const sid = row.sectionId && (await store.sections.get(row.sectionId)) ? row.sectionId : null;
    const list = await listRows(store, row.cemeteryId, sid);
    const i = list.findIndex((r) => r.id === row.id);
    await reorder(list, i, i + by, (rid, order) => store.rows.update(rid, { order }));
  });
}

/** Move a row into another section (or none), at the end. */
export async function setRowSection(store: Store, row: Row, sectionId: ID | null) {
  await store.run('Move row', async () => {
    const order = nextOrder(await listRows(store, row.cemeteryId, sectionId));
    await store.rows.update(row.id, { sectionId: sectionId ?? undefined, order });
  });
}

/** Live stones per row id. */
export async function rowStoneCounts(store: Store, cemeteryId: ID): Promise<Map<ID, number>> {
  const out = new Map<ID, number>();
  for (const m of await store.monuments.listByCemetery(cemeteryId)) {
    const id = m.address?.rowId;
    if (id) out.set(id, (out.get(id) ?? 0) + 1);
  }
  return out;
}
