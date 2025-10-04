/**
 * Type definitions for cemetery data model
 */

/**
 * Marker types for cemetery features
 */
export type MarkerType = 'grave' | 'landmark' | 'street';

/**
 * Landmark types with corresponding icons
 */
export type LandmarkType =
  | 'bench'
  | 'tree'
  | 'pine'
  | 'building'
  | 'statue'
  | 'other';

export interface CemeteryGrid {
  rows: number;
  cols: number;
  cellSize?: number; // in pixels for rendering
}

export interface Cemetery {
  id: string;
  name: string;
  grid: CemeteryGrid;
  last_modified: string; // ISO8601
  modified_by: string;
  license?: string;
}

export interface GridPosition {
  row: number;
  col: number;
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lon, lat]
}

export interface GraveProperties {
  name?: string;
  birth?: string; // ISO8601 date string
  death?: string; // ISO8601 date string
  inscription?: string;
  notes?: string;
  deleted?: boolean;
  last_modified: string; // ISO8601
  modified_by: string;
}

export interface Grave {
  uuid: string;
  plot: string;
  grid: GridPosition;
  geometry?: GeoPoint;
  properties: GraveProperties;
}

export interface LandmarkProperties {
  name?: string;
  description?: string;
  notes?: string;
  deleted?: boolean;
  last_modified: string; // ISO8601
  modified_by: string;
}

export interface Landmark {
  uuid: string;
  landmark_type: LandmarkType;
  grid: GridPosition;
  geometry?: GeoPoint;
  properties: LandmarkProperties;
}

export type ChangeOperation = 'set' | 'delete';

export interface ChangeLogEntry {
  op: ChangeOperation;
  uuid: string;
  changes: Record<string, unknown>;
  timestamp: string; // ISO8601
  user: string;
}

export interface CemeteryData {
  schema_version: string;
  cemetery: Cemetery;
  graves: Grave[];
  landmarks?: Landmark[]; // Optional for backward compatibility
  change_log: ChangeLogEntry[];
}

export interface MergeResult {
  added: Grave[];
  updated: Grave[];
  conflicts: MergeConflict[];
}

export interface MergeConflict {
  uuid: string;
  field: string;
  localValue: unknown;
  incomingValue: unknown;
  localTimestamp: string;
  incomingTimestamp: string;
  localModifiedBy: string;
  incomingModifiedBy: string;
}

export interface ConflictResolution {
  uuid: string;
  field: string;
  resolvedValue: unknown;
  resolution: 'local' | 'incoming' | 'manual';
}
