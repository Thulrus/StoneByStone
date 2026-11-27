import { useLingui } from '@lingui/react/macro';
import { INDEX_FIELDS, type ColumnMapping, type IndexField } from '../../../data/format/index-csv';
import { INDEX_FIELD_LABEL } from './field-labels';

const PREVIEW_ROWS = 4;

/**
 * One column per CSV column: what it holds (a select) over its header and first values, so
 * the mapping can be checked against the data.
 */
export function ColumnMapper({
  headers,
  rows,
  mapping,
  onChange,
}: {
  headers: readonly string[];
  rows: readonly (readonly string[])[];
  mapping: ColumnMapping;
  onChange: (m: ColumnMapping) => void;
}) {
  const { t } = useLingui();
  const preview = rows.slice(0, PREVIEW_ROWS);
  return (
    <div className="relative overflow-x-auto rounded-lg sbs-border">
      <table className="border-collapse text-start text-sm">
        <thead>
          <tr>
            {headers.map((h, i) => {
              const column = i + 1;
              return (
                <th key={i} scope="col" className="min-w-40 p-2 align-top font-normal">
                  <label className="flex flex-col gap-1">
                    <span className="truncate font-semibold" title={h}>
                      {h || t`Column ${column}`}
                    </span>
                    <select
                      className="min-h-12 rounded-lg bg-surface-2 px-2 text-base"
                      value={mapping[i] ?? 'ignore'}
                      onChange={(e) => {
                        const next = [...mapping];
                        next[i] = e.currentTarget.value as IndexField;
                        onChange(next);
                      }}
                    >
                      {INDEX_FIELDS.map((f) => (
                        <option key={f} value={f}>
                          {t(INDEX_FIELD_LABEL[f])}
                        </option>
                      ))}
                    </select>
                  </label>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {preview.map((r, ri) => (
            <tr key={ri} className="border-t border-border">
              {headers.map((_, ci) => (
                <td
                  key={ci}
                  className={
                    mapping[ci] === 'ignore'
                      ? 'max-w-48 truncate p-2 text-fg-muted line-through'
                      : 'max-w-48 truncate p-2'
                  }
                >
                  {r[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
