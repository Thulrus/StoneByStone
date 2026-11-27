import { useLingui } from '@lingui/react/macro';
import { formatDate, indexLocation, type Person } from '../../../domain';

/** "4 Mar 1820 – 10 Feb 1890 · Section A, Row 3" for a person. */
export function useRecordLine() {
  const { t } = useLingui();
  return (p: Person) => {
    const born = p.birth ? formatDate(p.birth) : '';
    const died = p.death ? formatDate(p.death) : p.burial ? t`buried ${formatDate(p.burial)}` : '';
    const loc = indexLocation(p);
    const where = [
      loc?.section && t`Section ${loc.section}`,
      loc?.row && t`Row ${loc.row}`,
      loc?.plot && t`Plot ${loc.plot}`,
    ]
      .filter(Boolean)
      .join(', ');
    return [born || died ? `${born || '?'} – ${died || '?'}` : '', where]
      .filter(Boolean)
      .join(' · ');
  };
}
