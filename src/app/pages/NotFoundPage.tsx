import { Trans } from '@lingui/react/macro';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        <Trans>Page not found</Trans>
      </h1>
      <Link to="/" className="text-primary underline">
        <Trans>Back to cemeteries</Trans>
      </Link>
    </div>
  );
}
