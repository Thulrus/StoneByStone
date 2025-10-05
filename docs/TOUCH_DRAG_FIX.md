# Touch Drag Fix for Grave Markers

## Issue

On touch screens, panning the map by dragging would not work when the drag gesture started on a grave marker. Landmarks and roads worked fine, but graves resulted in no panning. Mouse dragging on PC worked correctly for all elements.

## Root Cause

The `handleTouchStart` function in `MapGrid.tsx` had a conditional check that prevented dragging from starting when the touch target was a grave marker:

```typescript
if (!(e.target as SVGElement).closest('.grave-marker')) {
  setIsDragging(true);
  // ... set drag start position
}
```

This check was intended to allow clicking on graves, but it completely blocked touch dragging when starting on a grave. Landmarks and roads didn't have this restriction, which is why they worked fine.

## Solution

The fix involved several changes to properly handle both touch dragging and tap detection:

### 1. Remove the Restrictive Check

Removed the conditional that prevented dragging on graves, allowing `isDragging` to be set regardless of what element is touched:

```typescript
const handleTouchStart = useCallback(
  (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true); // Always allow dragging
      setDragStart({
        x: touch.clientX - transform.x,
        y: touch.clientY - transform.y,
      });
      setMouseDownPos({ x: touch.clientX, y: touch.clientY });
    }
    // ...
  },
  [transform]
);
```

### 2. Track Touch Movement

Added `lastTouchPos` state to track where the touch moved to, enabling drag distance calculation:

```typescript
const [lastTouchPos, setLastTouchPos] = useState<{
  x: number;
  y: number;
} | null>(null);
```

Updated `handleTouchMove` to record the last touch position:

```typescript
setLastTouchPos({ x: touch.clientX, y: touch.clientY });
```

### 3. Detect Tap vs Drag

Enhanced `handleMarkerClick` to detect whether a touch was a drag or a tap by comparing the start and end positions:

```typescript
// Check for touch drag (lastTouchPos indicates touch was moved)
if (lastTouchPos && mouseDownPos) {
  const touchDragDistance = Math.sqrt(
    Math.pow(lastTouchPos.x - mouseDownPos.x, 2) +
      Math.pow(lastTouchPos.y - mouseDownPos.y, 2)
  );
  // If touch moved more than 5 pixels, it was a drag, not a tap
  if (touchDragDistance >= 5) {
    return; // Don't trigger marker selection
  }
}
```

### 4. Clean Up State

Updated `handleTouchEnd` to properly clear both position tracking states:

```typescript
setTimeout(() => {
  setMouseDownPos(null);
  setLastTouchPos(null);
}, 0);
```

## Result

- ✅ Touch dragging now works when starting on any element (graves, landmarks, roads, empty cells)
- ✅ Tap detection still works - tapping a grave selects it
- ✅ Drag vs tap is properly distinguished using a 5-pixel threshold
- ✅ Mouse dragging continues to work as before
- ✅ Consistent behavior across all marker types

## Testing

Tested on:

- Touch screen devices (tablets, phones)
- Desktop with mouse
- Both panning and selecting markers work correctly

## Files Modified

- `src/components/MapGrid.tsx` - Touch event handlers and drag detection logic

## Date

October 4, 2025
