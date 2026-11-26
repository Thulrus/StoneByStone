import { useLingui } from '@lingui/react/macro';
import { useCallback } from 'react';
import type { Monument, Row } from '../../domain';

/** "Row 4, stone 3" (or "Row 4", or "Stone") for a stone. */
export function useStoneLabel(rows: readonly Row[], labelOf: (r: Row) => string) {
  const { t } = useLingui();
  return useCallback(
    (stone: Pick<Monument, 'address'> | undefined) => {
      const row = rows.find((r) => r.id === stone?.address?.rowId);
      if (!row) return t`Stone`;
      const rowName = labelOf(row);
      const index = stone?.address?.rowIndex;
      if (index === undefined) return t`Row ${rowName}`;
      const n = index + 1;
      return t`Row ${rowName}, stone ${n}`;
    },
    [rows, labelOf, t],
  );
}
