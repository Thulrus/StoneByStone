import { Trans } from '@lingui/react/macro';
import { useParams } from 'react-router';

/** Placeholder until the map lands (M2). */
export function CemeteryPage() {
  const { cemeteryId } = useParams();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">
        <Trans>Cemetery</Trans>
      </h1>
      <p className="text-fg-muted">
        <Trans>Cemetery {cemeteryId} will open here.</Trans>
      </p>
    </div>
  );
}
