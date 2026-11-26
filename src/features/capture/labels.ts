import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type { PhotoRole } from '../../domain';

/** Roles offered while capturing (plan §8); `other` is only set later, at the desk. */
export const CAPTURE_ROLES = ['front', 'back', 'detail', 'context'] as const satisfies PhotoRole[];

export const ROLE_LABEL: Record<PhotoRole, MessageDescriptor> = {
  front: msg`Front`,
  back: msg`Back`,
  detail: msg`Detail`,
  context: msg`Context`,
  other: msg`Other`,
};
