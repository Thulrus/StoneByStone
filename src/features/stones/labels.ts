import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type { MonumentStatus } from '../../domain';

export const STATUS_LABEL: Record<MonumentStatus, MessageDescriptor> = {
  located: msg`Located`,
  photographed: msg`Photographed`,
  transcribed: msg`Transcribed`,
  verified: msg`Verified`,
};
