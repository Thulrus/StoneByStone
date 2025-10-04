# Marker System Design

## Overview

This document outlines the design for extending the cemetery mapping system to support multiple marker types, non-rectangular cemetery shapes, and dynamic grid resizing.

## Goals

1. Support multiple marker types (graves, landmarks, streets)
2. Enable click-to-add workflow for easy marker placement
3. Allow non-rectangular cemetery boundaries
4. Support dynamic grid resizing without breaking existing markers
5. Maintain backward compatibility with existing data

## Data Model Changes

### Schema Version 2.0.0

#### New Marker Types

**Grave** (existing, with minor updates):

- UUID, plot, grid position, properties
- Rendered as tombstone icon

**Landmark**:

- UUID, name, type (tree, statue, entrance, bench, etc.)
- Grid position
- Icon/symbol
- Description, notes
- Last modified, modified by

**Street**:

- UUID, name
- Path (array of grid positions for polyline)
- Width (in grid cells)
- Last modified, modified by

#### Cemetery Updates

Add to `Cemetery` interface:

```typescript
{
  grid: {
    rows: number;
    cols: number;
    cellSize?: number;
    mask?: boolean[][]; // true = available, false = out of bounds
  }
}
```

The mask allows for non-rectangular shapes by marking which cells are valid.

### TypeScript Types

```typescript
export type MarkerType = 'grave' | 'landmark' | 'street';

export type LandmarkType =
  | 'tree'
  | 'statue'
  | 'entrance'
  | 'bench'
  | 'fountain'
  | 'building'
  | 'gate'
  | 'sign'
  | 'other';

export interface Landmark {
  uuid: string;
  type: 'landmark';
  landmark_type: LandmarkType;
  name: string;
  grid: GridPosition;
  geometry?: GeoPoint;
  properties: {
    description?: string;
    notes?: string;
    deleted?: boolean;
    last_modified: string;
    modified_by: string;
  };
}

export interface Street {
  uuid: string;
  type: 'street';
  name: string;
  path: GridPosition[]; // Array of grid positions
  width?: number; // Width in grid cells (default 1)
  geometry?: GeoJSON.LineString;
  properties: {
    notes?: string;
    deleted?: boolean;
    last_modified: string;
    modified_by: string;
  };
}

// Update Grave to include type
export interface Grave {
  uuid: string;
  type: 'grave'; // Add discriminator
  plot: string;
  grid: GridPosition;
  geometry?: GeoPoint;
  properties: GraveProperties;
}

// Union type for all markers
export type Marker = Grave | Landmark | Street;

export interface CemeteryData {
  schema_version: string;
  cemetery: Cemetery;
  graves: Grave[]; // Keep for backward compatibility
  landmarks?: Landmark[];
  streets?: Street[];
  change_log: ChangeLogEntry[];
}
```

## UI Changes

### Marker Toolbar

Add a floating toolbar (desktop: bottom-left, mobile: below view tabs) with buttons:

- **Grave** 🪦 - Add grave marker
- **Landmark** 🌳 - Add landmark (opens submenu: tree, statue, entrance, etc.)
- **Street** 🛣️ - Add street marker
- **Resize Grid** ⊞ - Open grid resize dialog

### Click-to-Add Workflow

1. User clicks a marker type button
2. Toolbar button highlights (active state)
3. Cursor changes to crosshair
4. User clicks on grid cell
5. For **grave/landmark**: Single click places marker, opens editor
6. For **street**:
   - First click starts path
   - Subsequent clicks add waypoints
   - Double-click or Enter to finish
   - Editor opens
7. Cancel with Escape or clicking toolbar button again

### MapGrid Updates

**Visual Changes:**

- Masked cells (out of bounds) shown in gray/striped
- Different icons for different marker types:
  - Graves: 🪦 tombstone (current)
  - Trees: 🌳
  - Statues: 🗿
  - Entrance: 🚪
  - Bench: 🪑
  - Other landmarks: 📍
  - Streets: dashed line connecting waypoints
- Active marker type shown with pulsing indicator

**Interaction:**

- Click-to-add mode vs. select mode
- Street drawing with polyline preview

### Editor Updates

**Multi-Purpose Editor:**

- Detects marker type and shows appropriate fields
- **Grave Editor**: (existing fields)
- **Landmark Editor**:
  - Type dropdown
  - Name
  - Description
  - Notes
  - Grid position (with fine-tune +/- buttons)
- **Street Editor**:
  - Name
  - Width
  - Path editor (list of waypoints with add/remove)
  - Notes

### Grid Resize Interface

Modal dialog with:

- Current size display (rows × cols)
- Add/remove rows (top/bottom)
- Add/remove columns (left/right)
- Preview showing existing markers
- Warning if removing cells with markers
- Confirm button

**Resize Behavior:**

- Adding rows/columns: Append to grid, update cemetery object
- Removing rows/columns:
  - Check for markers in removed area
  - If markers exist, show warning with options:
    - Cancel operation
    - Move markers to edge
    - Delete markers
- Update cemetery.grid.rows/cols
- If mask exists, update mask dimensions

### Cemetery Mask Editor

For non-rectangular shapes:

- Toggle grid cells as available/unavailable
- Visual paint tool: click cells to toggle
- Brush modes: single cell, fill, rectangle
- Preview overlay on map
- Can't mask cells with existing markers

## IndexedDB Updates

Add new object stores:

- `landmarks`: Keyed by UUID
- `streets`: Keyed by UUID
- Keep `graves` for backward compatibility

Update queries to fetch all marker types.

## Migration Strategy

### Backward Compatibility

**Reading old data (v1.x):**

- `graves` array present, no `landmarks` or `streets`
- No `type` field on graves
- No `mask` on grid
- Load normally, auto-add `type: 'grave'` field

**Writing new data (v2.0.0):**

- Include `schema_version: "2.0.0"`
- Include all three arrays: `graves`, `landmarks`, `streets`
- Include `type` field on all markers
- Include `mask` on grid if non-rectangular

**Import v1.x files:**

- Detect schema version
- Auto-migrate by adding missing fields
- Show migration success message

## Implementation Phases

### Phase 1: Data Model & Types

1. Update `cemetery.ts` with new types
2. Update `cemetery.schema.json` to v2.0.0
3. Add migration utilities

### Phase 2: Database Layer

1. Add new IndexedDB stores
2. Update `idb.ts` with landmark/street functions
3. Add migration logic

### Phase 3: Map Rendering

1. Update `MapGrid.tsx` to render different marker types
2. Add click-to-add mode
3. Implement street polyline rendering
4. Add grid mask visualization

### Phase 4: Marker Toolbar

1. Create `MarkerToolbar.tsx` component
2. Add marker type state management
3. Implement click-to-add workflow

### Phase 5: Editor Updates

1. Refactor `GraveEditor.tsx` → `MarkerEditor.tsx`
2. Add type-specific field sets
3. Add grid position fine-tuning

### Phase 6: Grid Management

1. Create `GridResizeDialog.tsx`
2. Add resize logic
3. Create `GridMaskEditor.tsx`
4. Add mask editing UI

### Phase 7: Testing & Polish

1. Test migration from v1.x data
2. Test all marker types
3. Test grid resize with existing markers
4. Update documentation
5. Add sample files with new features

## Questions to Consider

1. **Street rendering**: Should streets visually cover multiple cells based on width?
2. **Landmark icons**: Should we use emoji, SVG icons, or allow custom icons?
3. **Grid resize**: Should we allow changing cell size, or only rows/cols?
4. **Mask editing**: Should this be a separate mode or integrated into normal editing?
5. **Spatial conflicts**: How do we handle landmarks/streets overlapping graves?
6. **Plot IDs**: Should landmarks and streets have plot-like identifiers?
7. **Bulk operations**: Should we support selecting multiple markers for batch edit/delete?

## Next Steps

1. Review and approve this design
2. Create feature branch
3. Implement Phase 1 (types)
4. Implement Phase 2 (database)
5. Continue with remaining phases
6. Comprehensive testing
7. Documentation updates
8. Merge to main

---

**Document Version**: 1.0  
**Date**: October 4, 2025  
**Status**: Proposed
