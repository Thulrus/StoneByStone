import { Trans, useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { useStore } from '../../app/store-context';
import type { Cemetery } from '../../domain';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { RadioGroup } from '../../ui/RadioGroup';
import { Sheet } from '../../ui/Sheet';
import { CustomSourceForm } from './CustomSourceForm';
import { allProviders, isUsable, type ImageryProvider } from './imagery';
import { removeCustomSource, setImageryKey, type ImagerySettings } from './imagery-settings';

export interface ImageryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cemetery: Cemetery;
  current: ImageryProvider;
  settings: ImagerySettings;
}

/** Choose this cemetery's imagery, add an Esri key, or add a custom source. */
export function ImageryPicker({
  open,
  onOpenChange,
  cemetery,
  current,
  settings,
}: ImageryPickerProps) {
  const { t } = useLingui();
  const store = useStore();
  const [adding, setAdding] = useState(false);
  const [esriKey, setEsriKey] = useState(settings.keys.esri ?? '');
  const providers = allProviders(settings.custom);

  const choose = async (id: string) => {
    await store.cemeteries.update(cemetery.id, { settings: { ...cemetery.settings, imagery: id } });
  };

  const describe = (p: ImageryProvider) => {
    if (!isUsable(p, settings.keys)) return t`needs an API key`;
    if (p.kind === 'street') return t`street map, online only`;
    return p.allowsOffline ? t`can be saved for offline use` : t`online only`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t`Imagery`}>
      <div className="flex flex-col gap-6">
        <RadioGroup
          legend={t`Map background for this cemetery`}
          name="imagery"
          value={current.id}
          onChange={(id) => void choose(id)}
          options={providers
            .filter((p) => isUsable(p, settings.keys))
            .map((p) => ({
              value: p.id,
              label: (
                <span>
                  {p.name} <span className="text-sm text-fg-muted">· {describe(p)}</span>
                </span>
              ),
            }))}
        />
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void setImageryKey(store, 'esri', esriKey);
          }}
        >
          <Field
            className="flex-1"
            label={t`Esri API key`}
            hint={t`Esri World Imagery needs your own ArcGIS key. It stays on this device.`}
            value={esriKey}
            autoComplete="off"
            onChange={(e) => setEsriKey(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            <Trans>Save key</Trans>
          </Button>
        </form>
        {settings.custom.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {settings.custom.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span>{s.name}</span>
                <Button variant="ghost" onClick={() => void removeCustomSource(store, s.id)}>
                  <Trans>Remove</Trans>
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {adding ? (
          <CustomSourceForm
            onSaved={(id) => {
              setAdding(false);
              void choose(id);
            }}
          />
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Trans>Add a custom source</Trans>
          </Button>
        )}
      </div>
    </Sheet>
  );
}
