import { Trans, useLingui } from '@lingui/react/macro';
import { useState, type FormEvent } from 'react';
import { useStore } from '../../app/store-context';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { RadioGroup } from '../../ui/RadioGroup';
import { customSourceProblem, type CustomSource } from './imagery';
import { saveCustomSource } from './imagery-settings';

/** Add a custom XYZ or WMS imagery source (plan §24), e.g. a county orthophoto service. */
export function CustomSourceForm({ onSaved }: { onSaved: (id: string) => void }) {
  const { t } = useLingui();
  const store = useStore();
  const [type, setType] = useState<CustomSource['type']>('xyz');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [layers, setLayers] = useState('');
  const [attribution, setAttribution] = useState('');
  const [maxzoom, setMaxzoom] = useState('19');
  const [allowsOffline, setAllowsOffline] = useState(false);
  const [error, setError] = useState<string>();

  const problems = {
    url: t`Enter a valid web address.`,
    https: t`The address must start with https://`,
    placeholders: t`An XYZ address needs {z}, {x} and {y} (or {quadkey}).`,
    layers: t`Enter the WMS layer name.`,
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const problem = customSourceProblem({ type, url: url.trim(), layers });
    if (problem) {
      setError(problems[problem]);
      return;
    }
    const source: CustomSource = {
      id: `custom:${store.newId()}`,
      name: name.trim() || new URL(url.trim().replaceAll(/[{}]/g, '')).hostname,
      type,
      url: url.trim(),
      ...(type === 'wms' ? { layers: layers.trim() } : {}),
      attribution: attribution.trim(),
      maxzoom: Math.min(24, Math.max(1, Number(maxzoom) || 19)),
      allowsOffline,
    };
    await saveCustomSource(store, source);
    onSaved(source.id);
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <RadioGroup
        legend={t`Type`}
        name="source-type"
        value={type}
        onChange={setType}
        options={[
          { value: 'xyz', label: t`Tiles (XYZ)` },
          { value: 'wms', label: t`WMS` },
        ]}
      />
      <Field label={t`Name`} value={name} onChange={(e) => setName(e.target.value)} />
      <Field
        label={t`Address`}
        hint={
          type === 'xyz'
            ? t`For example https://example.org/tiles/{z}/{x}/{y}.png`
            : t`The WMS service address, without GetMap parameters`
        }
        value={url}
        inputMode="url"
        onChange={(e) => {
          setUrl(e.target.value);
          setError(undefined);
        }}
        error={error}
      />
      {type === 'wms' ? (
        <Field label={t`Layer`} value={layers} onChange={(e) => setLayers(e.target.value)} />
      ) : null}
      <Field
        label={t`Attribution`}
        hint={t`Shown on the map. Check the provider's terms.`}
        value={attribution}
        onChange={(e) => setAttribution(e.target.value)}
      />
      <Field
        label={t`Highest zoom level`}
        value={maxzoom}
        inputMode="numeric"
        onChange={(e) => setMaxzoom(e.target.value)}
      />
      <label className="flex min-h-12 items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-primary"
          checked={allowsOffline}
          onChange={(e) => setAllowsOffline(e.target.checked)}
        />
        <Trans>The provider's terms allow saving tiles for offline use</Trans>
      </label>
      <div className="flex justify-end">
        <Button type="submit">
          <Trans>Add source</Trans>
        </Button>
      </div>
    </form>
  );
}
