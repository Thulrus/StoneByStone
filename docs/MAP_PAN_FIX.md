# Map Pan/Drag Behavior Fix

## Overview

Fixed the map panning behavior so that dragging always pans the map, regardless of whether the drag starts on an element (grave, landmark, road) or on empty space.

## Problem

**Previous Behavior**:

- Clicking and dragging on **empty space** → Panned the map ✓
- Clicking and dragging on an **element** (grave/landmark/road) → Selected the element, but did NOT pan the map ✗

This was confusing because users expected consistent drag-to-pan behavior across the entire map surface.

**Root Cause**:
The `handleMouseDown` function had a check that prevented dragging from starting when clicking on a `.grave-marker`:

```typescript
if (
  e.button === 0 &&
  !(e.target as SVGElement).closest('.grave-marker') // ← This prevented dragging!
) {
  setIsDragging(true);
  // ...
}
```

## Solution

### 1. Always Allow Dragging to Start

Removed the element check so dragging can start from any click:

```typescript
// Always allow dragging, regardless of what element is clicked
if (e.button === 0) {
  setIsDragging(true);
  setDragStart({
    x: e.clientX - transform.x,
    y: e.clientY - transform.y,
  });
}
```

### 2. Add Drag Distance Check to Element Clicks

Updated `handleMarkerClick` to check if the user actually dragged or just clicked:

```typescript
const handleMarkerClick = useCallback(
  (row, col, clickedElement, e: React.MouseEvent) => {
    // Check if this was a drag - if so, don't trigger selection
    if (mouseDownPos) {
      const dragDistance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) +
          Math.pow(e.clientY - mouseDownPos.y, 2)
      );
      // If mouse moved more than 5 pixels, it was a drag, not a click
      if (dragDistance >= 5) {
        return; // Don't select element, allow pan to complete
      }
    }

    // Less than 5 pixels of movement = it's a click, select the element
    // ...
  }
);
```

### 3. Update All onClick Handlers

Modified all element onClick handlers to pass the event object:

**Roads**:

```typescript
onClick={(e) =>
  handleMarkerClick(cell.row, cell.col, { type: 'road', data: road }, e)
}
```

**Graves**:

```typescript
onClick={(e) => {
  if (addMode === 'street') return;
  handleMarkerClick(row, col, { type: 'grave', data: grave }, e);
}}
```

**Landmarks**:

```typescript
onClick={(e) => {
  if (addMode === 'street') return;
  handleMarkerClick(landmark.grid.row, landmark.grid.col, { type: 'landmark', data: landmark }, e);
}}
```

## User Experience

### New Behavior

**Clicking** (< 5px movement):

- ✓ Click on grave → Opens grave editor
- ✓ Click on landmark → Opens landmark editor
- ✓ Click on road → Opens road editor
- ✓ Click on empty space (in add mode) → Places new element

**Dragging** (≥ 5px movement):

- ✓ Drag from empty space → Pans the map
- ✓ Drag from grave → Pans the map (does NOT open editor)
- ✓ Drag from landmark → Pans the map (does NOT open editor)
- ✓ Drag from road → Pans the map (does NOT open editor)

### Threshold Details

The 5-pixel threshold is used to distinguish between clicks and drags:

- **< 5 pixels**: Treated as a click → triggers element selection
- **≥ 5 pixels**: Treated as a drag → pans the map, cancels selection

This threshold:

- Prevents accidental selections during small hand movements
- Allows intentional clicks even if the hand isn't perfectly still
- Provides a consistent user experience across desktop and touch devices

## Technical Implementation

### Modified Files

**`src/components/MapGrid.tsx`**:

1. **handleMouseDown**: Removed `.grave-marker` check
   - Before: Only allowed drag if NOT clicking on a grave marker
   - After: Always allows drag to start on left mouse button

2. **handleMarkerClick**: Added drag distance checking
   - Before: Called handlers immediately on click
   - After: Checks if user dragged ≥ 5px before calling handlers
   - Added `e: React.MouseEvent` parameter to function signature
   - Added `mouseDownPos` to dependency array

3. **onClick handlers**: Updated to pass event object
   - Roads: `onClick={(e) => handleMarkerClick(..., e)}`
   - Graves: `onClick={(e) => handleMarkerClick(..., e)}`
   - Landmarks: `onClick={(e) => handleMarkerClick(..., e)}`

### Existing Infrastructure Leveraged

The fix leverages existing infrastructure:

- `mouseDownPos` state (already tracked mouse down position)
- `isDragging` state (already managed drag state)
- `dragStart` state (already stored drag start coordinates)
- Drag distance calculation (similar logic already used in `handleCellClick`)

## Testing Checklist

- [x] Click on grave → Opens editor (no drag)
- [x] Drag starting from grave → Pans map (doesn't open editor)
- [x] Click on landmark → Opens editor (no drag)
- [x] Drag starting from landmark → Pans map (doesn't open editor)
- [x] Click on road → Opens editor (no drag)
- [x] Drag starting from road → Pans map (doesn't open editor)
- [x] Click on empty space in add mode → Places element
- [x] Drag from empty space → Pans map
- [x] Multi-element selection still works (click on cell with multiple elements)
- [x] Road editing mode still works (click cells to add to road)
- [x] TypeScript compilation succeeds
- [x] Build succeeds

## Edge Cases Handled

1. **Road Selection Mode**:
   - When `addMode === 'street'`, graves and landmarks have `pointerEvents: 'none'`
   - This prevents interaction with them during road placement
   - Unchanged by this fix

2. **Multi-Element Selection**:
   - If multiple elements exist at same position, shows selection modal
   - Drag distance check applies before modal is shown
   - Modal only appears for true clicks, not drags

3. **Small Accidental Movements**:
   - 5-pixel threshold accounts for natural hand tremor
   - Prevents unintentional pan when user just wants to click

## Performance Considerations

- **No Performance Impact**: The drag distance calculation is only performed:
  - On click events (not continuous)
  - Using simple arithmetic (no expensive operations)
  - Already present in codebase for cell clicks

- **State Updates**: No additional state added, uses existing `mouseDownPos`

## Future Enhancements

Potential improvements:

1. **Configurable Threshold**: Allow users to adjust the 5px threshold in settings
2. **Touch Gestures**: Different threshold for touch devices (maybe 10px)
3. **Context Menu**: Right-click to select element without risk of accidental pan
4. **Visual Feedback**: Show subtle indicator when drag starts (e.g., cursor change)
5. **Accessibility**: Keyboard navigation for selecting elements without mouse

## Related Documentation

- See `docs/MULTI_ELEMENT_SELECTION.md` for multi-element click handling
- See `docs/MARKER_SYSTEM_DESIGN.md` for overall marker interaction design
