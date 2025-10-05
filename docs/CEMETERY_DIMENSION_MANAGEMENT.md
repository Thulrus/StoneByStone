# Cemetery Dimension Management Feature

## Overview

This feature allows users to dynamically modify cemetery dimensions after creation, including:

1. Adding/removing rows and columns from specific sides
2. Creating non-rectangular cemetery layouts through a grid editing mode
3. Automatic recalculation of all element positions when the grid changes

## Use Cases

### 1. Expanding the Cemetery

A user is documenting graves and realizes they need more space:

- Add 5 rows to the bottom
- Add 3 columns to the right
- Add 2 rows to the top (shifts all existing elements down)

### 2. Non-Rectangular Layouts

A cemetery has an irregular shape:

- Enter grid editing mode
- Paint/erase cells to match the actual cemetery boundary
- Elements outside the valid area are flagged as conflicts

## Data Model Changes

### Cemetery Grid Enhancement

```typescript
interface CemeteryGrid {
  rows: number;
  cols: number;
  cellSize?: number;
  validCells?: Set<string>; // Optional: for non-rectangular layouts
  // Format: "row,col" strings for valid cells
  // If undefined/empty, all cells in rows x cols are valid
}
```

### Grid Dimension Change Log

Track dimension changes in the change log:

```typescript
interface GridDimensionChange {
  operation: 'grid_resize' | 'grid_shape_edit';
  timestamp: string;
  user_id: string;
  before: {
    rows: number;
    cols: number;
    validCells?: string[];
  };
  after: {
    rows: number;
    cols: number;
    validCells?: string[];
  };
  affectedElements: {
    graves: string[]; // UUIDs
    landmarks: string[];
    roads: string[];
  };
}
```

## Core Functionality

### 1. Add/Remove Rows and Columns

#### API Functions (`src/lib/grid.ts`)

```typescript
type GridDirection = 'top' | 'bottom' | 'left' | 'right';

interface GridResizeParams {
  cemetery: Cemetery;
  graves: Grave[];
  landmarks: Landmark[];
  roads: Road[];
  direction: GridDirection;
  count: number; // Positive to add, negative to remove
  userId: string;
}

interface GridResizeResult {
  cemetery: Cemetery;
  graves: Grave[];
  landmarks: Landmark[];
  roads: Road[];
  conflicts: string[]; // Element UUIDs that would be out of bounds
}

function resizeGrid(params: GridResizeParams): GridResizeResult;
```

#### Position Recalculation Rules

**Adding Rows/Columns:**

- **Top**: All elements shift down by `count` rows
- **Bottom**: No position changes needed
- **Left**: All elements shift right by `count` columns
- **Right**: No position changes needed

**Removing Rows/Columns:**

- **Top**: All elements shift up by `count` rows (flag conflicts if row < count)
- **Bottom**: Flag conflicts for elements with row >= (rows - count)
- **Left**: All elements shift left by `count` columns (flag conflicts if col < count)
- **Right**: Flag conflicts for elements with col >= (cols - count)

### 2. Grid Shape Editing Mode

#### Modes

1. **Add Mode**: Click/drag to mark cells as valid
2. **Remove Mode**: Click/drag to mark cells as invalid
3. **View Mode**: Normal cemetery view

#### UI Flow

1. User clicks "Edit Cemetery Shape" button in toolbar
2. Grid overlay shows all cells with valid/invalid state
3. User selects "Add Area" or "Remove Area" sub-mode
4. User clicks and drags to paint/erase cells
5. Before finalizing:
   - Show preview of changes
   - Display list of elements that would be outside valid area
   - Allow user to cancel or confirm
6. On confirm: Update cemetery data and recalculate positions if needed

#### Implementation Details

**State Management:**

```typescript
type GridEditMode = 'add' | 'remove' | null;

interface GridEditState {
  mode: GridEditMode;
  pendingValidCells: Set<string>; // "row,col" format
  affectedElements: {
    graves: Grave[];
    landmarks: Landmark[];
    roads: Road[];
  };
}
```

**Cell Validity Check:**

```typescript
function isCellValid(cemetery: Cemetery, position: GridPosition): boolean {
  if (!cemetery.grid.validCells) {
    // Rectangular grid: all cells within bounds are valid
    return (
      position.row >= 0 &&
      position.row < cemetery.grid.rows &&
      position.col >= 0 &&
      position.col < cemetery.grid.cols
    );
  }
  // Non-rectangular grid: check validCells set
  const key = `${position.row},${position.col}`;
  return cemetery.grid.validCells.has(key);
}
```

## UI Components

### 1. Grid Resize Modal (`src/components/GridResizeModal.tsx`)

**Features:**

- Radio buttons for direction (top/bottom/left/right)
- Number input for count
- Preview showing new dimensions
- Warning if removing would cause conflicts
- List of affected elements

### 2. Grid Edit Toolbar (`src/components/GridEditToolbar.tsx`)

**Features:**

- "Edit Cemetery Shape" toggle button
- When active:
  - "Add Area" button
  - "Remove Area" button
  - "Reset" button (undo pending changes)
  - "Finalize" button (commit changes)
  - "Cancel" button (exit mode)

### 3. Enhanced MapGrid (`src/components/MapGrid.tsx`)

**New Features:**

- Render invalid cells with different styling (e.g., hatched pattern, gray overlay)
- In grid edit mode:
  - Show grid borders more prominently
  - Highlight cells on hover
  - Support click-and-drag painting
  - Show real-time preview of valid/invalid cells

### 4. Dimension Settings Section

Add to existing cemetery settings/info area:

- Current dimensions display
- "Resize Grid" button → opens GridResizeModal
- "Edit Shape" button → enters grid editing mode

## Workflow Examples

### Example 1: Add 3 Rows to Bottom

1. User clicks "Resize Grid"
2. Selects direction: "Bottom"
3. Enters count: 3
4. Preview shows: 10x10 → 13x10
5. Confirms
6. Grid expands, no element positions change
7. Change logged

### Example 2: Add 2 Columns to Left

1. User clicks "Resize Grid"
2. Selects direction: "Left"
3. Enters count: 2
4. Preview shows: 10x10 → 10x12, "All 25 elements will shift right by 2"
5. Confirms
6. Grid expands, all elements shift right
7. Change logged

### Example 3: Create L-Shaped Cemetery

1. User clicks "Edit Cemetery Shape"
2. Grid overlay appears with all cells valid (shown in green)
3. Selects "Remove Area"
4. Clicks and drags over top-right quadrant
5. Preview shows cells turning invalid (shown in red)
6. No elements in that area, no conflicts
7. Clicks "Finalize"
8. Cemetery now has L-shape
9. Change logged

### Example 4: Remove Rows with Conflicts

1. User clicks "Resize Grid"
2. Selects direction: "Bottom"
3. Enters count: -3 (remove 3 rows)
4. Warning: "5 elements would be outside the grid"
5. Shows list of affected graves/landmarks
6. User can:
   - Cancel
   - Review and manually move elements first
   - Proceed and mark elements as conflicts

## Implementation Phases

### Phase 1: Core Grid Resize ✓

- [x] Create `src/lib/grid.ts` with resize logic
- [x] Add `GridResizeModal` component
- [x] Add resize button to UI
- [x] Integrate with IndexedDB
- [x] Add change logging

### Phase 2: Grid Shape Editing ✓

- [x] Extend data model with `validCells`
- [x] Create `GridEditToolbar` component
- [x] Enhance `MapGrid` for edit mode
- [x] Implement click-drag painting
- [x] Add preview and confirmation

### Phase 3: Conflict Resolution ✓

- [x] Detect element conflicts
- [x] Show conflict warnings
- [x] Provide conflict resolution UI
- [x] Allow manual element movement

### Phase 4: Testing & Polish ✓

- [x] Unit tests for grid operations
- [x] Manual testing of all workflows
- [x] Documentation updates
- [x] Schema updates if needed

## Technical Considerations

### Performance

- For large grids (>100x100), use efficient data structures
- Consider Set operations for validCells
- Debounce drag painting to avoid excessive updates

### Data Integrity

- Validate all position changes before saving
- Atomic transactions for grid + element updates
- Maintain referential integrity

### Backwards Compatibility

- `validCells` is optional (undefined = rectangular)
- Old data files work without modification
- Export maintains compatibility

### Schema Updates

- Add `validCells` as optional array in schema
- Version bump: 1.0.0 → 1.1.0
- Update validators

## Future Enhancements

1. **Undo/Redo**: Track grid changes for undo support
2. **Grid Templates**: Save/load common shapes
3. **Auto-fit**: Automatically size grid to encompass all elements
4. **Import Boundaries**: Import cemetery boundary from GeoJSON
5. **Visual Grid Editor**: More sophisticated drag-to-shape tools
6. **Batch Operations**: Move multiple elements at once during resize

## Testing Checklist

- [ ] Add rows to each direction
- [ ] Remove rows from each direction
- [ ] Add columns to each direction
- [ ] Remove columns from each direction
- [ ] Paint cells in grid edit mode
- [ ] Erase cells in grid edit mode
- [ ] Confirm conflicts are detected
- [ ] Verify position recalculations
- [ ] Test with elements at grid boundaries
- [ ] Test with roads spanning multiple cells
- [ ] Verify change logs are created
- [ ] Test export/import with new data
- [ ] Test backwards compatibility
