import { Trans } from '@lingui/react/macro';
import { Link } from 'react-router';
import { CemeteryList } from '../../features/cemeteries/CemeteryList';
import { ImportButton } from '../../features/cemeteries/ImportButton';
import { WelcomeCard } from '../../features/cemeteries/WelcomeCard';
import { BackupBanner } from '../../features/share/BackupBanner';
import { InstallPrompt } from '../InstallPrompt';

export function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          <Trans>Cemeteries</Trans>
        </h1>
        <div className="flex gap-2">
          <ImportButton />
          <Link
            to="/new"
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 font-medium text-primary-fg hover:opacity-90"
          >
            <Trans>New cemetery</Trans>
          </Link>
        </div>
      </div>
      <WelcomeCard />
      <BackupBanner />
      <InstallPrompt />
      <CemeteryList />
    </div>
  );
}
