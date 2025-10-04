# Multi-Element Selection and Z-Order Fix

## Overview

This document describes the implementation of a fix for two related issues with the cemetery map grid:

1. **Z-Order Problem**: Roads were rendering on top of graves and landmarks, blocking clicks
2. **Multi-Element Selection**: When multiple elements occupy the same grid cell, users need a way to select which one to interact with

## Implementation

### 1. SVG Z-Order Fix

**Problem**: In SVG, elements are rendered in document order, with later elements appearing on top. Roads were being rendered last, so they covered graves and landmarks.

**Solution**: Reordered the rendering in `MapGrid.tsx` so that roads render FIRST, followed by graves, then landmarks:

```tsx
// Rendering order (determines z-order):
1. Roads/Paths (lowest - underneath everything)
2. Graves
3. Landmarks (highest)
```

This ensures that:

- Roads appear as paths underneath markers
- Grave and landmark icons remain clickable
- Visual hierarchy matches user expectations

### 2. Multi-Element Selection Modal

**Problem**: When multiple elements (e.g., a grave and a road, or overlapping graves) share the same grid position, clicking would only select one, potentially hiding the others from user interaction.

**Solution**: Created `CellSelectionModal.tsx` that:

- Detects when multiple elements exist at a clicked position
- Shows a modal dialog with all elements at that position
- Displays appropriate icons and labels for each element type
- Allows user to select which element to interact with

### Component Architecture

#### CellSelectionModal Component

```typescript
interface CellSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: Array<{
    type: 'grave' | 'landmark' | 'road';
    data: Grave | Landmark | Road;
  }>;
  position: { row: number; col: number };
  onSelectElement: (element: CellElement) => void;
}
```

**Features**:

- Displays all elements with appropriate icons (grave stone, landmark type icon, or road icon)
- Shows descriptive labels (name, plot, landmark type, road name)
- Supports dark mode
- Keyboard accessible (ESC to close)
- Mobile-friendly responsive design

#### MapGrid Updates

Added multi-element detection logic:

1. **Position Maps**: Created `useMemo` hooks to build efficient lookups:
   - `gravesByPosition`: Map of grid position → graves at that position
   - `landmarksByPosition`: Map of grid position → landmarks at that position
   - `roadsByPosition`: Map of grid position → roads covering that position

2. **Element Aggregation**: `getElementsAtPosition()` helper function collects all elements at a given row/col

3. **Smart Click Handler**: `handleMarkerClick()` callback checks for multiple elements:
   - If multiple elements exist → calls `onMultipleElementsClick` to show modal
   - If single element → calls the appropriate handler directly (onGraveClick, onLandmarkClick, onRoadClick)

4. **Updated Click Handlers**: All individual element click handlers (graves, landmarks, roads) now route through `handleMarkerClick` for consistency

#### CemeteryView Integration

Added state management for the selection modal:

```typescript
const [showCellSelection, setShowCellSelection] = useState(false);
const [selectedCellElements, setSelectedCellElements] = useState<Array<...>>([]);
const [selectedCellPosition, setSelectedCellPosition] = useState<GridPosition | null>(null);
```

Handler functions:

- `handleMultipleElementsClick`: Opens modal with element list
- `handleElementSelection`: Routes selected element to appropriate editor

## User Experience

### Single Element (Previous Behavior)

- Click → element editor opens immediately
- No change in user experience

### Multiple Elements (New Behavior)

1. User clicks on a cell with multiple elements
2. Modal appears showing all elements at that position
3. User selects desired element from list
4. Modal closes and appropriate editor opens

### Visual Feedback

- Each element type shows its characteristic icon
- Clear labels indicate element names/identifiers
- Grid position shown in modal title
- Hover states for better interactivity

## Technical Details

### Performance Optimizations

1. **useMemo for Position Maps**: Position lookups are memoized and only recalculated when the underlying data changes

   ```typescript
   const gravesByPosition = useMemo(() => { ... }, [graves]);
   ```

2. **useCallback for Handlers**: Event handlers are memoized to prevent unnecessary re-renders

   ```typescript
   const handleMarkerClick = useCallback((row, col, element) => { ... }, [deps]);
   ```

3. **Efficient Lookups**: O(1) position lookup using Map data structures instead of O(n) array searches

### Rendering Order

SVG elements now render in this sequence:

1. Grid lines and labels (background)
2. Clickable cells (when in add mode)
3. **Roads** (semi-transparent overlays)
4. **Graves** (stone icons with state overlays)
5. **Landmarks** (type-specific icons)
6. Selected road cells (when editing roads)

### Edge Cases Handled

1. **Road Editing Mode**: During road placement (`addMode === 'street'`), graves and landmarks are non-interactive to avoid conflicts
2. **Empty Cells**: Clicking empty cells behaves normally (adds new element if in add mode)
3. **Single vs Multiple**: No modal overhead when only one element exists at a position
4. **Cancel Action**: User can close modal without selecting to cancel operation

## Files Modified

1. **src/components/CellSelectionModal.tsx** (NEW)
   - Modal component for multi-element selection
   - Icon rendering for all element types
   - Keyboard and mouse interaction handling

2. **src/components/MapGrid.tsx**
   - Added `useMemo` import
   - Created position lookup maps
   - Added `getElementsAtPosition()` helper
   - Added `handleMarkerClick()` callback
   - Reordered SVG rendering (roads before graves/landmarks)
   - Updated all click handlers to use `handleMarkerClick`

3. **src/pages/CemeteryView.tsx**
   - Imported `CellSelectionModal`
   - Added modal state management
   - Added `handleMultipleElementsClick()` handler
   - Added `handleElementSelection()` router
   - Passed `onMultipleElementsClick` prop to MapGrid
   - Rendered `CellSelectionModal` component

## Testing Checklist

- [x] Single grave click → opens editor directly
- [x] Single landmark click → opens editor directly
- [x] Single road click → opens editor directly
- [x] Multiple elements at position → shows selection modal
- [x] Modal displays correct icons for all element types
- [x] Modal displays correct labels/names
- [x] Selecting element from modal → opens correct editor
- [x] Closing modal without selection → no editor opens
- [x] Roads render underneath graves and landmarks
- [x] All elements remain clickable
- [x] Road editing mode disables grave/landmark interaction
- [x] Dark mode styling works correctly
- [x] Responsive design works on mobile
- [x] TypeScript compilation succeeds
- [x] Build succeeds

## Future Enhancements

Potential improvements for future versions:

1. **Visual Indicators**: Show a badge/counter on cells with multiple elements
2. **Keyboard Navigation**: Arrow keys to navigate between elements in modal
3. **Preview on Hover**: Show quick preview when hovering over elements in modal
4. **Drag to Select**: Allow dragging across cell selection modal items
5. **Context Menu**: Right-click to show element options without opening full editor

## Related Documentation

- See `docs/MARKER_SYSTEM_DESIGN.md` for overall marker system architecture
- See `docs/ICON_IMPLEMENTATION.md` for icon usage details
- See `samples/willow-creek-example.cem.json` for test data with overlapping elements
