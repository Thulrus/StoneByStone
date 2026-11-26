import { Trans, useLingui } from '@lingui/react/macro';
import { useId, useState } from 'react';
import type { TranscriptionDraft } from '../../data/transcribe';
import {
  FRAKTUR,
  INSCRIPTION_LANGUAGES,
  INSCRIPTION_SCRIPTS,
  SYMBOLS,
  toggleIn,
} from '../../domain';
import { Chip } from '../../ui/Chip';
import { cn } from '../../ui/cn';
import { SYMBOL_LABEL } from '../stones/attribute-labels';
import { Input } from './Input';

type StoneDraft = Pick<TranscriptionDraft, 'symbols' | 'carver' | 'language' | 'script'>;

const KNOWN = new Set<string>(SYMBOLS);
const splitOthers = (text: string) =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Symbols, carver, language and script of the stone (plan §10.4). */
export function StoneFields({
  value,
  onChange,
}: {
  value: StoneDraft;
  onChange: (patch: Partial<StoneDraft>) => void;
}) {
  const { t, i18n } = useLingui();
  const langId = useId();
  const scriptId = useId();
  const known = value.symbols.filter((s) => KNOWN.has(s));
  const [others, setOthers] = useState(() => value.symbols.filter((s) => !KNOWN.has(s)).join(', '));
  const names = (type: 'language' | 'script') => {
    try {
      return new Intl.DisplayNames([i18n.locale], { type });
    } catch {
      return undefined;
    }
  };
  const languageNames = names('language');
  const scriptNames = names('script');
  const select = cn('min-h-12 rounded-lg bg-surface px-3 text-base text-fg sbs-border');

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg p-3 sbs-border">
      <legend className="px-1 font-medium">
        <Trans>The stone</Trans>
      </legend>
      <div role="group" aria-label={t`Symbols`} className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          <Trans>Symbols</Trans>
        </p>
        <div className="flex flex-wrap gap-2">
          {SYMBOLS.map((id) => (
            <Chip
              key={id}
              selected={known.includes(id)}
              onSelectedChange={() =>
                onChange({ symbols: [...toggleIn(known, id, SYMBOLS), ...splitOthers(others)] })
              }
            >
              {t(SYMBOL_LABEL[id])}
            </Chip>
          ))}
        </div>
      </div>
      <Input
        label={t`Other symbols, separated by commas`}
        value={others}
        onChange={(e) => {
          const text = e.currentTarget.value;
          setOthers(text);
          onChange({ symbols: [...known, ...splitOthers(text)] });
        }}
      />
      <Input
        label={t`Carver's signature`}
        placeholder={t`as carved, often at the base`}
        value={value.carver}
        onChange={(e) => onChange({ carver: e.currentTarget.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={langId} className="text-sm font-medium">
            <Trans>Language</Trans>
          </label>
          <select
            id={langId}
            className={select}
            value={value.language}
            onChange={(e) => onChange({ language: e.currentTarget.value })}
          >
            <option value="">{t`Not set`}</option>
            {[...new Set([...INSCRIPTION_LANGUAGES, value.language].filter(Boolean))].map(
              (code) => (
                <option key={code} value={code}>
                  {languageNames?.of(code) ?? code}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={scriptId} className="text-sm font-medium">
            <Trans>Script</Trans>
          </label>
          <select
            id={scriptId}
            className={select}
            value={value.script}
            onChange={(e) => onChange({ script: e.currentTarget.value })}
          >
            <option value="">{t`Not set`}</option>
            {[...new Set([...INSCRIPTION_SCRIPTS, value.script].filter(Boolean))].map((code) => (
              <option key={code} value={code}>
                {code === FRAKTUR ? t`Fraktur (blackletter)` : (scriptNames?.of(code) ?? code)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}
