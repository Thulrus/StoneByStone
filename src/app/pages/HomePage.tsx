import { Trans } from '@lingui/react/macro';
import { CemeteryList } from '../../features/cemeteries/CemeteryList';
import { ImportButton } from '../../features/cemeteries/ImportButton';
import { NewCemeteryButton } from '../../features/cemeteries/NewCemeteryDialog';
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
          <NewCemeteryButton />
        </div>
      </div>
      <WelcomeCard />
      <BackupBanner />
      <InstallPrompt />
      <CemeteryList />
    </div>
  );
}
