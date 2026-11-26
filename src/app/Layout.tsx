import { useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { NavLink, Outlet, useNavigation } from 'react-router';
import { listCemeteries } from '../data/cemeteries';
import { ensurePersisted } from '../features/settings/storage';
import { BackupIndicator } from '../features/share/BackupBanner';
import { useBackupReminder } from '../features/share/useBackupReminder';
import { cn } from '../ui/cn';
import { useStore } from './store-context';

function NavItem({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          'flex min-h-12 min-w-16 flex-col items-center justify-center rounded-lg px-3 md:flex-row md:gap-2',
          isActive ? 'font-semibold text-primary underline underline-offset-4' : 'text-fg',
        )
      }
    >
      <span aria-hidden="true" className="text-xl md:text-base">
        {icon}
      </span>
      <span className="text-sm md:text-base">{label}</span>
    </NavLink>
  );
}

/** App frame: top bar on wide screens, bottom bar (thumb zone) on phones. */
export function Layout() {
  const { t } = useLingui();
  const navigation = useNavigation();
  const store = useStore();
  const hasData = useLiveQuery(async () => (await listCemeteries(store)).length > 0, [store]);
  useBackupReminder();

  // Ask the browser to keep our data once there is something worth keeping (plan §14).
  useEffect(() => {
    if (hasData) void ensurePersisted();
  }, [hasData]);

  const nav = (
    <>
      <NavItem to="/" icon="⌂" label={t`Cemeteries`} />
      <NavItem to="/settings" icon="⚙" label={t`Settings`} />
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:bg-surface focus:p-3"
      >
        {t`Skip to content`}
      </a>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-surface px-4 pt-[env(safe-area-inset-top)] sbs-border border-x-0 border-t-0">
        <span className="py-3 text-lg font-bold">StoneByStone</span>
        <div className="flex items-center gap-2">
          <BackupIndicator />
          <nav aria-label={t`Main`} className="hidden gap-1 md:flex">
            {nav}
          </nav>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        aria-busy={navigation.state === 'loading'}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 outline-none"
      >
        <Outlet />
      </main>
      <nav
        aria-label={t`Main`}
        className="sticky bottom-0 flex justify-around bg-surface pb-[env(safe-area-inset-bottom)] sbs-border border-x-0 border-b-0 md:hidden"
      >
        {nav}
      </nav>
    </div>
  );
}
