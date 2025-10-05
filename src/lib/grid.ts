/**
 * Grid manipulation utilities for cemetery dimension management
 */

import type {
  Cemetery,
  Grave,
  Landmark,
  Road,
  GridPosition,
} from '../types/cemetery';

export type GridDirection = 'top' | 'bottom' | 'left' | 'right';

export interface GridResizeParams {
  cemetery: Cemetery;
  graves: Grave[];
  landmarks: Landmark[];
  roads: Road[];
  direction: GridDirection;
  count: number; // Positive to add, negative to remove
  userId: string;
}

export interface GridResizeResult {
  cemetery: Cemetery;
  graves: Grave[];
  landmarks: Landmark[];
  roads: Road[];
  conflicts: Array<{
    type: 'grave' | 'landmark' | 'road';
    uuid: string;
    name: string;
    position: GridPosition;
  }>;
}

export interface GridShapeEditResult {
  cemetery: Cemetery;
  invalidElements: Array<{
    type: 'grave' | 'landmark' | 'road';
    uuid: string;
    name: string;
    positions: GridPosition[]; // Multiple positions for roads
  }>;
}

/**
 * Check if a cell is valid in the cemetery grid
 */
export function isCellValid(
  cemetery: Cemetery,
  position: GridPosition
): boolean {
  // Check bounds first
  if (
    position.row < 0 ||
    position.row >= cemetery.grid.rows ||
    position.col < 0 ||
    position.col >= cemetery.grid.cols
  ) {
    return false;
  }

  // If no validCells set, all cells within bounds are valid (rectangular grid)
  if (!cemetery.grid.validCells || cemetery.grid.validCells.size === 0) {
    return true;
  }

  // Check if cell is in validCells set
  const key = `${position.row},${position.col}`;
  return cemetery.grid.validCells.has(key);
}

/**
 * Adjust a grid position based on resize operation
 */
function adjustPosition(
  position: GridPosition,
  direction: GridDirection,
  count: number
): GridPosition {
  const newPosition = { ...position };

  switch (direction) {
    case 'top':
      newPosition.row += count;
      break;
    case 'left':
      newPosition.col += count;
      break;
    // bottom and right don't affect existing positions
    case 'bottom':
    case 'right':
      break;
  }

  return newPosition;
}

/**
 * Check if a position would be out of bounds after resize
 */
function wouldBeOutOfBounds(
  position: GridPosition,
  direction: GridDirection,
  count: number,
  newRows: number,
  newCols: number
): boolean {
  const adjusted = adjustPosition(position, direction, count);
  return (
    adjusted.row < 0 ||
    adjusted.row >= newRows ||
    adjusted.col < 0 ||
    adjusted.col >= newCols
  );
}

/**
 * Resize the cemetery grid and adjust all element positions
 */
export function resizeGrid(params: GridResizeParams): GridResizeResult {
  const { cemetery, graves, landmarks, roads, direction, count, userId } =
    params;

  // Calculate new dimensions
  let newRows = cemetery.grid.rows;
  let newCols = cemetery.grid.cols;

  switch (direction) {
    case 'top':
    case 'bottom':
      newRows += count;
      break;
    case 'left':
    case 'right':
      newCols += count;
      break;
  }

  // Validate new dimensions
  if (newRows < 1 || newCols < 1) {
    throw new Error('Grid dimensions must be at least 1x1');
  }

  // Track conflicts
  const conflicts: GridResizeResult['conflicts'] = [];

  // Adjust grave positions (exclude deleted graves from conflicts)
  const adjustedGraves = graves.map((grave) => {
    const newPosition = adjustPosition(grave.grid, direction, count);

    // Check for conflicts (but don't report deleted graves)
    if (
      !grave.properties.deleted &&
      (wouldBeOutOfBounds(grave.grid, direction, count, newRows, newCols) ||
        newPosition.row < 0 ||
        newPosition.col < 0)
    ) {
      conflicts.push({
        type: 'grave',
        uuid: grave.uuid,
        name: grave.properties.name || 'Unnamed grave',
        position: grave.grid,
      });
      // Return unchanged if conflict
      return grave;
    }

    return {
      ...grave,
      grid: newPosition,
      properties: {
        ...grave.properties,
        last_modified: new Date().toISOString(),
        modified_by: userId,
      },
    };
  });

  // Adjust landmark positions (exclude deleted landmarks from conflicts)
  const adjustedLandmarks = landmarks.map((landmark) => {
    const newPosition = adjustPosition(landmark.grid, direction, count);

    // Check for conflicts (but don't report deleted landmarks)
    if (
      !landmark.properties.deleted &&
      (wouldBeOutOfBounds(landmark.grid, direction, count, newRows, newCols) ||
        newPosition.row < 0 ||
        newPosition.col < 0)
    ) {
      conflicts.push({
        type: 'landmark',
        uuid: landmark.uuid,
        name: landmark.properties.name || `${landmark.landmark_type} landmark`,
        position: landmark.grid,
      });
      // Return unchanged if conflict
      return landmark;
    }

    return {
      ...landmark,
      grid: newPosition,
      properties: {
        ...landmark.properties,
        last_modified: new Date().toISOString(),
        modified_by: userId,
      },
    };
  });

  // Adjust road cell positions (exclude deleted roads from conflicts)
  const adjustedRoads = roads.map((road) => {
    const newCells = road.cells.map((cell) =>
      adjustPosition(cell, direction, count)
    );

    // Check if any cells would be out of bounds (but don't report deleted roads)
    const hasConflict = road.cells.some(
      (cell) =>
        wouldBeOutOfBounds(cell, direction, count, newRows, newCols) ||
        adjustPosition(cell, direction, count).row < 0 ||
        adjustPosition(cell, direction, count).col < 0
    );

    if (hasConflict && !road.properties.deleted) {
      conflicts.push({
        type: 'road',
        uuid: road.uuid,
        name: road.properties.name || 'Unnamed road',
        position: road.cells[0], // Show first cell position
      });
      // Return unchanged if conflict
      return road;
    }

    return {
      ...road,
      cells: newCells,
      properties: {
        ...road.properties,
        last_modified: new Date().toISOString(),
        modified_by: userId,
      },
    };
  });

  // Adjust validCells if present (for non-rectangular grids)
  let newValidCells: Set<string> | undefined = undefined;
  if (cemetery.grid.validCells && cemetery.grid.validCells.size > 0) {
    newValidCells = new Set<string>();

    // First, adjust existing valid cells to their new positions
    cemetery.grid.validCells.forEach((cellKey: string) => {
      const [rowStr, colStr] = cellKey.split(',');
      const row = parseInt(rowStr, 10);
      const col = parseInt(colStr, 10);
      const newPos = adjustPosition({ row, col }, direction, count);

      // Only add if within new bounds
      if (
        newPos.row >= 0 &&
        newPos.row < newRows &&
        newPos.col >= 0 &&
        newPos.col < newCols &&
        newValidCells // TypeScript guard
      ) {
        newValidCells.add(`${newPos.row},${newPos.col}`);
      }
    });

    // Then, add ONLY the newly created cells from the resize operation
    // These are cells that didn't exist in the old grid dimensions
    const oldRows = cemetery.grid.rows;
    const oldCols = cemetery.grid.cols;

    if (direction === 'bottom' && count > 0) {
      // New rows added at bottom
      for (let row = oldRows; row < newRows; row++) {
        for (let col = 0; col < newCols; col++) {
          newValidCells.add(`${row},${col}`);
        }
      }
    } else if (direction === 'right' && count > 0) {
      // New columns added at right
      for (let row = 0; row < newRows; row++) {
        for (let col = oldCols; col < newCols; col++) {
          newValidCells.add(`${row},${col}`);
        }
      }
    } else if (direction === 'top' && count > 0) {
      // New rows added at top (rows 0 to count-1 are new)
      for (let row = 0; row < count; row++) {
        for (let col = 0; col < newCols; col++) {
          newValidCells.add(`${row},${col}`);
        }
      }
    } else if (direction === 'left' && count > 0) {
      // New columns added at left (cols 0 to count-1 are new)
      for (let row = 0; row < newRows; row++) {
        for (let col = 0; col < count; col++) {
          newValidCells.add(`${row},${col}`);
        }
      }
    }
    // If count < 0 (removing rows/cols), no new cells to add
  }

  // Create updated cemetery
  const updatedCemetery: Cemetery = {
    ...cemetery,
    grid: {
      ...cemetery.grid,
      rows: newRows,
      cols: newCols,
      validCells: newValidCells,
    },
    last_modified: new Date().toISOString(),
    modified_by: userId,
  };

  return {
    cemetery: updatedCemetery,
    graves: adjustedGraves,
    landmarks: adjustedLandmarks,
    roads: adjustedRoads,
    conflicts,
  };
}

/**
 * Update cemetery shape with custom valid cells
 */
export function updateCemeteryShape(
  cemetery: Cemetery,
  graves: Grave[],
  landmarks: Landmark[],
  roads: Road[],
  validCells: Set<string>
): GridShapeEditResult {
  // Find elements that are no longer in valid cells
  const invalidElements: GridShapeEditResult['invalidElements'] = [];

  // Check graves (exclude deleted graves)
  graves
    .filter((grave) => !grave.properties.deleted)
    .forEach((grave) => {
      const key = `${grave.grid.row},${grave.grid.col}`;
      if (!validCells.has(key)) {
        invalidElements.push({
          type: 'grave',
          uuid: grave.uuid,
          name: grave.properties.name || 'Unnamed grave',
          positions: [grave.grid],
        });
      }
    });

  // Check landmarks (exclude deleted landmarks)
  landmarks
    .filter((landmark) => !landmark.properties.deleted)
    .forEach((landmark) => {
      const key = `${landmark.grid.row},${landmark.grid.col}`;
      if (!validCells.has(key)) {
        invalidElements.push({
          type: 'landmark',
          uuid: landmark.uuid,
          name:
            landmark.properties.name || `${landmark.landmark_type} landmark`,
          positions: [landmark.grid],
        });
      }
    });

  // Check roads (exclude deleted roads, any cell invalid makes the whole road invalid)
  roads
    .filter((road) => !road.properties.deleted)
    .forEach((road) => {
      const invalidCells = road.cells.filter((cell) => {
        const key = `${cell.row},${cell.col}`;
        return !validCells.has(key);
      });

      if (invalidCells.length > 0) {
        invalidElements.push({
          type: 'road',
          uuid: road.uuid,
          name: road.properties.name || 'Unnamed road',
          positions: invalidCells,
        });
      }
    });

  // Update cemetery
  const updatedCemetery: Cemetery = {
    ...cemetery,
    grid: {
      ...cemetery.grid,
      validCells: validCells.size > 0 ? validCells : undefined,
    },
    last_modified: new Date().toISOString(),
    modified_by: cemetery.modified_by, // Keep same user for shape edit
  };

  return {
    cemetery: updatedCemetery,
    invalidElements,
  };
}

/**
 * Get all valid cells for a rectangular grid
 */
export function getAllValidCells(cemetery: Cemetery): Set<string> {
  const validCells = new Set<string>();

  for (let row = 0; row < cemetery.grid.rows; row++) {
    for (let col = 0; col < cemetery.grid.cols; col++) {
      validCells.add(`${row},${col}`);
    }
  }

  return validCells;
}

/**
 * Convert validCells Set to array for serialization
 */
export function validCellsToArray(
  validCells?: Set<string>
): string[] | undefined {
  if (!validCells || validCells.size === 0) {
    return undefined;
  }
  return Array.from(validCells);
}

/**
 * Convert validCells array to Set
 */
export function validCellsFromArray(
  validCells?: string[]
): Set<string> | undefined {
  if (!validCells || validCells.length === 0) {
    return undefined;
  }
  return new Set(validCells);
}
