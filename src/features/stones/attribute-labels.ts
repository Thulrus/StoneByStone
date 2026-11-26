import { msg } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type {
  CAPTURE_FLAGS,
  CONDITIONS,
  MapFeatureKind,
  MATERIALS,
  MONUMENT_KINDS,
  SYMBOLS,
} from '../../domain';

export const KIND_LABEL: Record<(typeof MONUMENT_KINDS)[number], MessageDescriptor> = {
  headstone: msg`Headstone`,
  footstone: msg`Footstone`,
  tablet: msg`Tablet`,
  obelisk: msg`Obelisk`,
  ledger: msg`Ledger`,
  'table-tomb': msg`Table / altar`,
  'box-tomb': msg`Box tomb`,
  cross: msg`Cross`,
  'flat-marker': msg`Flat marker`,
  pedestal: msg`Pedestal / die-on-base`,
  fieldstone: msg`Fieldstone`,
  government: msg`Government / military`,
  temporary: msg`Temporary marker`,
  fragment: msg`Fragment`,
  other: msg`Other`,
};

export const MATERIAL_LABEL: Record<(typeof MATERIALS)[number], MessageDescriptor> = {
  marble: msg`Marble`,
  granite: msg`Granite`,
  slate: msg`Slate`,
  sandstone: msg`Sandstone`,
  brownstone: msg`Brownstone`,
  limestone: msg`Limestone`,
  'white-bronze': msg`Zinc (white bronze)`,
  'cast-iron': msg`Cast iron`,
  wood: msg`Wood`,
  concrete: msg`Concrete`,
  fieldstone: msg`Fieldstone`,
  other: msg`Other`,
};

export const CONDITION_LABEL: Record<(typeof CONDITIONS)[number], MessageDescriptor> = {
  good: msg`Good`,
  weathered: msg`Weathered`,
  'biological-growth': msg`Lichen / growth`,
  cracked: msg`Cracked`,
  broken: msg`Broken`,
  fallen: msg`Fallen`,
  sunken: msg`Sunken`,
  tilted: msg`Tilted`,
  illegible: msg`Illegible`,
  repaired: msg`Repaired`,
  missing: msg`Missing`,
};

export const FLAG_LABEL: Record<(typeof CAPTURE_FLAGS)[number], MessageDescriptor> = {
  'needs-revisit': msg`Needs revisit`,
  'uncertain-position': msg`Uncertain position`,
  'veteran-marker': msg`Veteran marker / flag holder`,
};

export const FEATURE_LABEL: Record<MapFeatureKind, MessageDescriptor> = {
  path: msg`Path`,
  road: msg`Road`,
  building: msg`Building`,
  tree: msg`Tree`,
  gate: msg`Gate`,
  fence: msg`Fence`,
  wall: msg`Wall`,
  enclosure: msg`Enclosure`,
  'family-plot': msg`Family plot`,
  water: msg`Water`,
  'large-monument': msg`Large monument`,
  bench: msg`Bench`,
  other: msg`Landmark`,
};

export const SYMBOL_LABEL: Record<(typeof SYMBOLS)[number], MessageDescriptor> = {
  'willow-urn': msg`Willow and urn`,
  urn: msg`Urn`,
  'draped-urn': msg`Draped urn`,
  willow: msg`Willow`,
  'deaths-head': msg`Death's head`,
  'soul-effigy': msg`Winged soul effigy`,
  cherub: msg`Cherub`,
  lamb: msg`Lamb`,
  dove: msg`Dove`,
  'clasped-hands': msg`Clasped hands`,
  'hand-up': msg`Hand pointing up`,
  'hand-down': msg`Hand pointing down`,
  'broken-column': msg`Broken column`,
  rose: msg`Rose / rosebud`,
  ihs: msg`IHS`,
  cross: msg`Cross`,
  'star-of-david': msg`Star of David`,
  masonic: msg`Masonic square and compass`,
  'odd-fellows': msg`Odd Fellows three links`,
  woodmen: msg`Woodmen of the World (tree stump)`,
  gar: msg`GAR star`,
};
