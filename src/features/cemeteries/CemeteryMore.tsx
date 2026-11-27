import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { duplicatesPath, matchPath, peoplePath, progressPath } from '../../app/paths';
import type { Cemetery } from '../../domain';
import { Button } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';

/**
 * The cemetery's other pages (plan §6: People, Progress, ...) behind one "More" button, so the
 * header stays short on a phone and the map keeps its height.
 */
export function CemeteryMore({ cemetery }: { cemetery: Cemetery }) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="lg" onClick={() => setOpen(true)}>
        <Trans>More</Trans>
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={cemetery.name}>
        <nav aria-label={t`Cemetery pages`} className="flex flex-col gap-2">
          <PageLink to={peoplePath(cemetery.id)} hint={t`Search names, dates and inscriptions`}>
            <Trans>People</Trans>
          </PageLink>
          <PageLink to={matchPath(cemetery.id)} hint={t`Link an imported burial index to stones`}>
            <Trans>Match index to stones</Trans>
          </PageLink>
          <PageLink to={duplicatesPath(cemetery.id)} hint={t`People or stones recorded twice`}>
            <Trans>Possible duplicates</Trans>
          </PageLink>
          <PageLink to={progressPath(cemetery.id)} hint={t`Status by row, and what to revisit`}>
            <Trans>Progress</Trans>
          </PageLink>
        </nav>
      </Sheet>
    </>
  );
}

function PageLink({ to, hint, children }: { to: string; hint: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex min-h-12 flex-col justify-center rounded-lg bg-surface-2 px-4 py-2"
    >
      <span className="font-medium">{children}</span>
      <span className="text-sm text-fg-muted">{hint}</span>
    </Link>
  );
}
