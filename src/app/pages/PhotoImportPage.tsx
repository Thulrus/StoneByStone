import type { Cemetery } from '../../domain';
import { useLayout } from '../../features/cemeteries/useLayout';
import { PhotoImportView } from '../../features/photo-import/PhotoImportView';
import { CemeteryGate } from './CemeteryGate';

export function PhotoImportPage() {
  return <CemeteryGate>{(c) => <Loaded cemetery={c} />}</CemeteryGate>;
}

function Loaded({ cemetery }: { cemetery: Cemetery }) {
  const layout = useLayout(cemetery.id);
  if (!layout) return null;
  return <PhotoImportView cemetery={cemetery} layout={layout} />;
}
