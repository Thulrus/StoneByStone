import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type { HistoryOp, PositionSource } from '../../../domain';

export const SOURCE_LABEL: Record<PositionSource, MessageDescriptor> = {
  gps: msg`GPS`,
  'gps-averaged': msg`averaged GPS`,
  map: msg`placing on the map`,
  'row-interpolated': msg`its place in the row`,
  relative: msg`a nearby stone or landmark`,
  overlay: msg`a plat or drone image`,
  'legacy-grid': msg`the v1 grid`,
  aligned: msg`dataset alignment`,
  imported: msg`an import`,
};

export const OP_LABEL: Record<HistoryOp, MessageDescriptor> = {
  create: msg`Created`,
  update: msg`Changed`,
  delete: msg`Deleted`,
  merge: msg`Merged`,
  import: msg`Imported`,
};
