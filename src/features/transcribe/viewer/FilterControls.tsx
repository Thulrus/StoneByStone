import { Trans, useLingui } from '@lingui/react/macro';
import { useId } from 'react';
import { Button } from '../../../ui/Button';
import { cn } from '../../../ui/cn';
import {
  NO_ENHANCEMENT,
  quarterTurn,
  withPreset,
  type Enhancement,
  type PresetId,
} from './filters';
import { setEnhancement } from './enhancement-store';

const group = cn('flex flex-col gap-2 rounded-lg p-2 sbs-border');

type NumberKey = {
  [K in keyof Enhancement]: Enhancement[K] extends number ? K : never;
}[keyof Enhancement];

function Slider({
  label,
  k,
  e,
  min,
  max,
  step,
}: {
  label: string;
  k: NumberKey;
  e: Enhancement;
  min: number;
  max: number;
  step: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-fg-muted">{e[k].toFixed(step < 1 ? 2 : 0)}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={e[k]}
        onChange={(ev) => {
          const v = Number(ev.currentTarget.value);
          setEnhancement((x) => ({ ...x, [k]: v }));
        }}
        className="min-h-8 accent-primary"
      />
    </div>
  );
}

function Toggle({ label, on, flip }: { label: string; on: boolean; flip: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={flip}
      className={cn(
        'min-h-12 rounded-lg px-3',
        on ? 'bg-primary font-semibold text-primary-fg' : 'bg-surface-2',
      )}
    >
      {label}
    </button>
  );
}

/** Enhancement controls (plan §9). Changes apply live; the photo itself never changes. */
export function FilterControls({ e }: { e: Enhancement }) {
  const { t } = useLingui();
  const preset = (id: PresetId) => setEnhancement((x) => withPreset(x, id));
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t`Presets`} className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => preset('marble')}>
          <Trans>Weathered marble</Trans>
        </Button>
        <Button variant="secondary" onClick={() => preset('faint')}>
          <Trans>Faint lettering</Trans>
        </Button>
        <Button variant="secondary" onClick={() => preset('raking')}>
          <Trans>Raking light</Trans>
        </Button>
        <Button variant="ghost" onClick={() => setEnhancement(NO_ENHANCEMENT)}>
          <Trans>Reset</Trans>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className={group}>
          <legend className="px-1 font-medium">
            <Trans>Tone</Trans>
          </legend>
          <Slider label={t`Brightness`} k="brightness" e={e} min={-1} max={1} step={0.01} />
          <Slider label={t`Contrast`} k="contrast" e={e} min={-1} max={1} step={0.01} />
          <Slider label={t`Black point`} k="black" e={e} min={0} max={0.9} step={0.01} />
          <Slider label={t`White point`} k="white" e={e} min={0.1} max={1} step={0.01} />
          <Slider label={t`Gamma`} k="gamma" e={e} min={0.2} max={5} step={0.01} />
          <div className="flex gap-2">
            <Toggle
              label={t`Grey`}
              on={e.grayscale}
              flip={() => setEnhancement((x) => ({ ...x, grayscale: !x.grayscale }))}
            />
            <Toggle
              label={t`Invert`}
              on={e.invert}
              flip={() => setEnhancement((x) => ({ ...x, invert: !x.invert }))}
            />
          </div>
        </fieldset>
        <fieldset className={group}>
          <legend className="px-1 font-medium">
            <Trans>Detail</Trans>
          </legend>
          <Slider label={t`Sharpen`} k="sharpen" e={e} min={0} max={3} step={0.05} />
          <Slider label={t`Local contrast`} k="localContrast" e={e} min={0} max={1} step={0.01} />
          <Slider label={t`Raking light`} k="emboss" e={e} min={0} max={1} step={0.01} />
          <Slider label={t`Light from (degrees)`} k="lightDeg" e={e} min={0} max={359} step={1} />
        </fieldset>
        <fieldset className={cn(group, 'sm:col-span-2')}>
          <legend className="px-1 font-medium">
            <Trans>Straighten and perspective</Trans>
          </legend>
          <Slider label={t`Straighten`} k="rotateDeg" e={e} min={-180} max={180} step={0.5} />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                setEnhancement((x) => ({ ...x, rotateDeg: quarterTurn(x.rotateDeg, -1) }))
              }
            >
              <Trans>Turn left</Trans>
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                setEnhancement((x) => ({ ...x, rotateDeg: quarterTurn(x.rotateDeg, 1) }))
              }
            >
              <Trans>Turn right</Trans>
            </Button>
          </div>
          <Slider label={t`Top/bottom width`} k="vertical" e={e} min={-0.5} max={0.5} step={0.01} />
          <Slider
            label={t`Left/right height`}
            k="horizontal"
            e={e}
            min={-0.5}
            max={0.5}
            step={0.01}
          />
        </fieldset>
      </div>
    </div>
  );
}
