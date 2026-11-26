import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type { PersonRelationType } from '../../domain';

/** What the other person is to this one. */
export const RELATION_LABEL: Record<PersonRelationType, MessageDescriptor> = {
  spouse: msg`Spouse`,
  parent: msg`Parent`,
  child: msg`Child`,
  sibling: msg`Sibling`,
  other: msg`Other relation`,
};

export const RELATION_TYPES: PersonRelationType[] = [
  'spouse',
  'parent',
  'child',
  'sibling',
  'other',
];
