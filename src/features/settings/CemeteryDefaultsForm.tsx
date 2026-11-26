import { useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../../app/store-context';
import { getCemeteryDefaults, setCemeteryDefaults } from '../../data/settings';
import { PHOTO_ORIGINAL_PX, PHOTO_SIZES } from '../../domain';
import { RadioGroup } from '../../ui/RadioGroup';

/** Units and photo quality used for new cemeteries. */
export function CemeteryDefaultsForm() {
  const { t } = useLingui();
  const store = useStore();
  const defaults = useLiveQuery(() => getCemeteryDefaults(store), [store]);
  if (!defaults) return null;

  const photoLabel = (px: number) => {
    if (px === PHOTO_ORIGINAL_PX) return t`Original size (largest files)`;
    if (px === 1200) return t`1200 px (smallest files)`;
    if (px === 1600) return t`1600 px (recommended)`;
    return t`${px} px`;
  };

  return (
    <>
      <RadioGroup
        legend={t`Units`}
        name="units"
        value={defaults.units}
        options={[
          { value: 'imperial', label: t`Feet and inches` },
          { value: 'metric', label: t`Metres` },
        ]}
        onChange={(units) => void setCemeteryDefaults(store, { units })}
      />
      <RadioGroup
        legend={t`Photo quality`}
        name="photoMaxPx"
        value={String(defaults.photoMaxPx)}
        options={PHOTO_SIZES.map((px) => ({ value: String(px), label: photoLabel(px) }))}
        onChange={(v) => void setCemeteryDefaults(store, { photoMaxPx: Number(v) })}
      />
      <p className="-mt-4 text-sm text-fg-muted">
        {t`Units and photo quality apply to cemeteries you create from now on.`}
      </p>
    </>
  );
}
