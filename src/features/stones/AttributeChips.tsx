import type { MessageDescriptor } from '@lingui/core';
import { useLingui } from '@lingui/react/macro';
import {
  CAPTURE_FLAGS,
  CONDITIONS,
  DEFAULT_KIND,
  MATERIALS,
  MONUMENT_KINDS,
  toggleIn,
  type Monument,
} from '../../domain';
import { cn } from '../../ui/cn';
import { CONDITION_LABEL, FLAG_LABEL, KIND_LABEL, MATERIAL_LABEL } from './attribute-labels';

export type AttributeGroup = 'kind' | 'material' | 'condition' | 'flags';
export type AttributePatch = Partial<Pick<Monument, 'kind' | 'material' | 'condition' | 'flags'>>;

const orNone = (xs: string[]) => (xs.length ? xs : undefined);

/**
 * One group of one-tap attribute chips (plan §8). Type and material are single choice,
 * condition and flags multiple. `dark` is for the camera.
 */
export function AttributeChips({
  monument: m,
  group,
  onPatch,
  tone = 'light',
  wrap = false,
}: {
  monument: Monument;
  group: AttributeGroup;
  onPatch: (patch: AttributePatch) => void;
  tone?: 'light' | 'dark';
  /** Wrap onto several lines instead of scrolling sideways. */
  wrap?: boolean;
}) {
  const { t } = useLingui();
  const spec: [
    readonly string[],
    Record<string, MessageDescriptor>,
    (id: string) => boolean,
    (id: string) => AttributePatch,
  ] =
    group === 'kind'
      ? [
          MONUMENT_KINDS,
          KIND_LABEL,
          (id) => m.kind === id,
          (id) => ({ kind: m.kind === id && id !== DEFAULT_KIND ? DEFAULT_KIND : id }),
        ]
      : group === 'material'
        ? [
            MATERIALS,
            MATERIAL_LABEL,
            (id) => m.material === id,
            (id) => ({ material: m.material === id ? undefined : id }),
          ]
        : group === 'condition'
          ? [
              CONDITIONS,
              CONDITION_LABEL,
              (id) => m.condition?.includes(id) ?? false,
              (id) => ({ condition: orNone(toggleIn(m.condition, id, CONDITIONS)) }),
            ]
          : [
              CAPTURE_FLAGS,
              FLAG_LABEL,
              (id) => m.flags?.includes(id) ?? false,
              (id) => ({ flags: orNone(toggleIn(m.flags, id, CAPTURE_FLAGS)) }),
            ];
  const [ids, labels, on, patch] = spec;
  return (
    <div className={cn('flex gap-2 pb-1', wrap ? 'flex-wrap' : 'overflow-x-auto')}>
      {ids.map((id) => {
        const pressed = on(id);
        const label = labels[id];
        return (
          <button
            key={id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onPatch(patch(id))}
            className={cn(
              'min-h-12 shrink-0 rounded-full px-4 text-base',
              tone === 'dark'
                ? pressed
                  ? 'bg-white font-semibold text-black'
                  : 'border border-white/60'
                : pressed
                  ? 'bg-primary font-semibold text-primary-fg'
                  : 'bg-surface text-fg sbs-border',
            )}
          >
            {pressed ? <span aria-hidden="true">✓ </span> : null}
            {label ? t(label) : id}
          </button>
        );
      })}
    </div>
  );
}
