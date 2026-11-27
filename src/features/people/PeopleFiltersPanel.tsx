import { Trans, useLingui } from '@lingui/react/macro';
import type { MessageDescriptor } from '@lingui/core';
import { useMemo, type ReactNode } from 'react';
import type { Monument, MonumentStatus, Section } from '../../domain';
import { Button } from '../../ui/Button';
import { cn } from '../../ui/cn';
import { MATERIAL_LABEL, SYMBOL_LABEL } from '../stones/attribute-labels';
import { STATUS_LABEL } from '../stones/labels';
import { STATUS_ORDER } from '../stones/status-style';
import { activeFilterCount, cleanFilters, type PeopleFilters } from './search';

const selectClassName = cn('min-h-12 rounded-lg bg-surface-2 px-3');
const inputClassName = cn('min-h-12 w-28 rounded-lg bg-surface px-3 text-base text-fg sbs-border');

/** Date range, section, status, symbol, material and veteran filters (plan §11). */
export function PeopleFiltersPanel({
  filters,
  onChange,
  sections,
  stones,
}: {
  filters: PeopleFilters;
  onChange: (f: PeopleFilters) => void;
  sections: readonly Section[];
  stones: readonly Monument[];
}) {
  const { t } = useLingui();
  // Only what this cemetery has, so the lists stay short.
  const { symbols, materials } = useMemo(() => {
    const sy = new Set<string>();
    const ma = new Set<string>();
    for (const m of stones) {
      for (const s of m.symbols ?? []) sy.add(s);
      if (m.material) ma.add(m.material);
    }
    return { symbols: [...sy], materials: [...ma] };
  }, [stones]);
  const label = (table: Record<string, MessageDescriptor>, v: string) =>
    v in table ? t(table[v] as MessageDescriptor) : v;
  const set = (patch: Partial<PeopleFilters>) => onChange(cleanFilters({ ...filters, ...patch }));
  const year = (v: string) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  };
  const count = activeFilterCount(filters);

  return (
    <details className="rounded-lg sbs-border">
      <summary className="min-h-12 cursor-pointer content-center px-3 font-medium">
        {count > 0 ? t`Filters (${count})` : t`Filters`}
      </summary>
      <div className="flex flex-wrap items-end gap-3 p-3 pt-0">
        <Labelled label={t`Died from (year)`}>
          <input
            type="number"
            inputMode="numeric"
            className={inputClassName}
            value={filters.from ?? ''}
            onChange={(e) => set({ from: year(e.currentTarget.value) })}
          />
        </Labelled>
        <Labelled label={t`to`}>
          <input
            type="number"
            inputMode="numeric"
            className={inputClassName}
            value={filters.to ?? ''}
            onChange={(e) => set({ to: year(e.currentTarget.value) })}
          />
        </Labelled>
        {sections.length > 0 ? (
          <Labelled label={t`Section`}>
            <select
              className={selectClassName}
              value={filters.section ?? ''}
              onChange={(e) => set({ section: e.currentTarget.value || undefined })}
            >
              <option value="">{t`Any`}</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="none">{t`No section`}</option>
            </select>
          </Labelled>
        ) : null}
        <Labelled label={t`Stone status`}>
          <select
            className={selectClassName}
            value={filters.status ?? ''}
            onChange={(e) =>
              set({ status: (e.currentTarget.value || undefined) as PeopleFilters['status'] })
            }
          >
            <option value="">{t`Any`}</option>
            {STATUS_ORDER.map((s: MonumentStatus) => (
              <option key={s} value={s}>
                {t(STATUS_LABEL[s])}
              </option>
            ))}
            <option value="no-stone">{t`No stone (index record)`}</option>
          </select>
        </Labelled>
        {symbols.length > 0 ? (
          <Labelled label={t`Symbol`}>
            <select
              className={selectClassName}
              value={filters.symbol ?? ''}
              onChange={(e) => set({ symbol: e.currentTarget.value || undefined })}
            >
              <option value="">{t`Any`}</option>
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {label(SYMBOL_LABEL, s)}
                </option>
              ))}
            </select>
          </Labelled>
        ) : null}
        {materials.length > 0 ? (
          <Labelled label={t`Material`}>
            <select
              className={selectClassName}
              value={filters.material ?? ''}
              onChange={(e) => set({ material: e.currentTarget.value || undefined })}
            >
              <option value="">{t`Any`}</option>
              {materials.map((m) => (
                <option key={m} value={m}>
                  {label(MATERIAL_LABEL, m)}
                </option>
              ))}
            </select>
          </Labelled>
        ) : null}
        <label className="flex min-h-12 items-center gap-2">
          <input
            type="checkbox"
            className="size-5"
            checked={filters.veteran ?? false}
            onChange={(e) => set({ veteran: e.currentTarget.checked })}
          />
          <Trans>Veterans only</Trans>
        </label>
        {count > 0 ? (
          <Button variant="ghost" onClick={() => onChange({})}>
            <Trans>Clear filters</Trans>
          </Button>
        ) : null}
      </div>
    </details>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
