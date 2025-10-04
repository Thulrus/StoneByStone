import type {
  CemeteryData,
  Grave,
  MergeResult,
  MergeConflict,
  ChangeLogEntry,
} from '../types/cemetery';
import { parseISO, isAfter } from 'date-fns';

/**
 * Merge engine for combining local and incoming cemetery data
 */

/**
 * Compare two timestamps and determine which is later
 */
function compareTimestamps(
  local: string,
  incoming: string
): 'local' | 'incoming' | 'equal' {
  const localDate = parseISO(local);
  const incomingDate = parseISO(incoming);

  if (isAfter(localDate, incomingDate)) return 'local';
  if (isAfter(incomingDate, localDate)) return 'incoming';
  return 'equal';
}

/**
 * Deep compare two values for equality
 */
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Merge two graves using last-write-wins strategy
 */
function mergeGraves(
  local: Grave,
  incoming: Grave,
  conflicts: MergeConflict[]
): { grave: Grave; hasChanges: boolean } {
  const result: Grave = { ...local };
  let hasChanges = false;
  const fieldsToMerge: Array<keyof Grave> = ['plot', 'grid', 'geometry'];
  const propertyFields: Array<keyof Grave['properties']> = [
    'name',
    'birth',
    'death',
    'inscription',
    'notes',
    'deleted',
  ];

  // Compare top-level fields
  for (const field of fieldsToMerge) {
    if (!deepEqual(local[field], incoming[field])) {
      hasChanges = true;
      const winner = compareTimestamps(
        local.properties.last_modified,
        incoming.properties.last_modified
      );

      if (winner === 'equal') {
        conflicts.push({
          uuid: local.uuid,
          field: field as string,
          localValue: local[field],
          incomingValue: incoming[field],
          localTimestamp: local.properties.last_modified,
          incomingTimestamp: incoming.properties.last_modified,
          localModifiedBy: local.properties.modified_by,
          incomingModifiedBy: incoming.properties.modified_by,
        });
      } else if (winner === 'incoming') {
        (result[field] as unknown) = incoming[field];
      }
    }
  }

  // Compare property fields
  for (const field of propertyFields) {
    const localVal = local.properties[field];
    const incomingVal = incoming.properties[field];

    if (!deepEqual(localVal, incomingVal)) {
      hasChanges = true;
      const winner = compareTimestamps(
        local.properties.last_modified,
        incoming.properties.last_modified
      );

      if (winner === 'equal') {
        conflicts.push({
          uuid: local.uuid,
          field: `properties.${field}`,
          localValue: localVal,
          incomingValue: incomingVal,
          localTimestamp: local.properties.last_modified,
          incomingTimestamp: incoming.properties.last_modified,
          localModifiedBy: local.properties.modified_by,
          incomingModifiedBy: incoming.properties.modified_by,
        });
      } else if (winner === 'incoming') {
        (result.properties[field] as unknown) = incomingVal;
      }
    }
  }

  // Always use the later timestamp
  const timeWinner = compareTimestamps(
    local.properties.last_modified,
    incoming.properties.last_modified
  );
  if (timeWinner === 'incoming') {
    result.properties.last_modified = incoming.properties.last_modified;
    result.properties.modified_by = incoming.properties.modified_by;
    hasChanges = true;
  }

  return { grave: result, hasChanges };
}

/**
 * Merge cemetery data using UUID-based matching
 */
export function mergeCemeteryData(
  local: CemeteryData,
  incoming: CemeteryData
): MergeResult {
  const result: MergeResult = {
    added: [],
    updated: [],
    conflicts: [],
  };

  // Create lookup maps
  const localGraves = new Map<string, Grave>();
  const incomingGraves = new Map<string, Grave>();

  for (const grave of local.graves) {
    localGraves.set(grave.uuid, grave);
  }

  for (const grave of incoming.graves) {
    incomingGraves.set(grave.uuid, grave);
  }

  // Process incoming graves
  for (const [uuid, incomingGrave] of incomingGraves) {
    const localGrave = localGraves.get(uuid);

    if (!localGrave) {
      // New grave - add it
      result.added.push(incomingGrave);
    } else {
      // Existing grave - merge
      const conflicts: MergeConflict[] = [];
      const { grave: merged, hasChanges } = mergeGraves(
        localGrave,
        incomingGrave,
        conflicts
      );

      if (conflicts.length > 0) {
        result.conflicts.push(...conflicts);
      }

      // Check if anything actually changed
      if (hasChanges) {
        result.updated.push(merged);
      }
    }
  }

  return result;
}

/**
 * Apply merge result to local data
 */
export function applyMergeResult(
  local: CemeteryData,
  incoming: CemeteryData,
  result: MergeResult
): CemeteryData {
  const graveMap = new Map<string, Grave>();

  // Start with local graves
  for (const grave of local.graves) {
    graveMap.set(grave.uuid, grave);
  }

  // Apply additions
  for (const grave of result.added) {
    graveMap.set(grave.uuid, grave);
  }

  // Apply updates
  for (const grave of result.updated) {
    graveMap.set(grave.uuid, grave);
  }

  // Merge change logs
  const changeLogSet = new Set<string>();
  const mergedChanges: ChangeLogEntry[] = [];

  // Add local changes
  for (const entry of local.change_log) {
    const key = `${entry.uuid}-${entry.timestamp}-${entry.op}`;
    if (!changeLogSet.has(key)) {
      changeLogSet.add(key);
      mergedChanges.push(entry);
    }
  }

  // Add incoming changes
  for (const entry of incoming.change_log) {
    const key = `${entry.uuid}-${entry.timestamp}-${entry.op}`;
    if (!changeLogSet.has(key)) {
      changeLogSet.add(key);
      mergedChanges.push(entry);
    }
  }

  // Sort by timestamp
  mergedChanges.sort((a, b) => {
    const dateA = parseISO(a.timestamp);
    const dateB = parseISO(b.timestamp);
    return dateA.getTime() - dateB.getTime();
  });

  // Use incoming cemetery metadata if it's newer
  const cemetery =
    compareTimestamps(
      local.cemetery.last_modified,
      incoming.cemetery.last_modified
    ) === 'incoming'
      ? incoming.cemetery
      : local.cemetery;

  return {
    schema_version: incoming.schema_version,
    cemetery,
    graves: Array.from(graveMap.values()),
    change_log: mergedChanges,
  };
}

/**
 * Detect spatial conflicts (graves at same grid position)
 */
export function detectSpatialConflicts(graves: Grave[]): Map<string, Grave[]> {
  const gridMap = new Map<string, Grave[]>();

  for (const grave of graves) {
    if (grave.properties.deleted) continue;

    const key = `${grave.grid.row},${grave.grid.col}`;
    if (!gridMap.has(key)) {
      gridMap.set(key, []);
    }
    gridMap.get(key)!.push(grave);
  }

  // Filter to only conflicts
  const conflicts = new Map<string, Grave[]>();
  for (const [key, list] of gridMap) {
    if (list.length > 1) {
      conflicts.set(key, list);
    }
  }

  return conflicts;
}
