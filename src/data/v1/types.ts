/** The v1 `.cem.json` format (schema_version "1.0.0"), as read from files (plan §22.1). */

export interface V1Cell {
  row: number;
  col: number;
}

export interface V1Point {
  type: 'Point';
  coordinates: [number, number];
}

interface V1Props {
  last_modified?: string;
  modified_by?: string;
  deleted?: boolean;
}

export interface V1Grave {
  uuid: string;
  plot?: string;
  grid?: V1Cell;
  geometry?: V1Point;
  properties: V1Props & {
    name?: string;
    birth?: string;
    death?: string;
    inscription?: string;
    notes?: string;
    group_ids?: string[];
  };
}

export interface V1Landmark {
  uuid: string;
  landmark_type: string;
  grid?: V1Cell;
  geometry?: V1Point;
  properties: V1Props & { name?: string; description?: string; notes?: string };
}

export interface V1Road {
  uuid: string;
  cells: V1Cell[];
  properties: V1Props & { name?: string; description?: string; notes?: string; color?: string };
}

export interface V1Group {
  uuid: string;
  properties: V1Props & { name: string; description?: string; color?: string };
}

export interface V1ChangeLogEntry {
  op: string;
  uuid: string;
  changes?: Record<string, unknown>;
  timestamp: string;
  user?: string;
}

export interface V1File {
  schema_version: string;
  cemetery: {
    id: string;
    name: string;
    /** `validCells` and `shape` are two spellings of the same thing (§22.1). */
    grid?: {
      rows: number;
      cols: number;
      cellSize?: number;
      validCells?: string[];
      shape?: V1Cell[];
    };
    last_modified?: string;
    modified_by?: string;
    license?: string;
  };
  graves: V1Grave[];
  landmarks?: V1Landmark[];
  roads?: V1Road[];
  groups?: V1Group[];
  change_log?: V1ChangeLogEntry[];
}

export function isV1File(json: unknown): json is V1File {
  return (
    typeof json === 'object' &&
    json !== null &&
    typeof (json as { schema_version?: unknown }).schema_version === 'string' &&
    (json as { schema_version: string }).schema_version.startsWith('1.')
  );
}
