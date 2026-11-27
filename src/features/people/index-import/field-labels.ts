import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type { IndexField } from '../../../data/format/index-csv';

export const INDEX_FIELD_LABEL: Record<IndexField, MessageDescriptor> = {
  ignore: msg`Don't import`,
  fullName: msg`Full name`,
  prefix: msg`Title (Mr., Rev., …)`,
  given: msg`Given name(s)`,
  middle: msg`Middle name(s)`,
  surname: msg`Surname`,
  birthSurname: msg`Maiden / birth surname`,
  suffix: msg`Suffix (Jr., Sr., …)`,
  birth: msg`Born`,
  death: msg`Died`,
  burial: msg`Buried`,
  age: msg`Age`,
  sex: msg`Sex`,
  relationship: msg`Relationship (wife of …)`,
  section: msg`Section`,
  row: msg`Row`,
  plot: msg`Plot / lot / grave`,
  military: msg`Military service`,
  occupation: msg`Occupation`,
  notes: msg`Notes`,
  ref: msg`Record number`,
};
