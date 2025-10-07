# Large Cemetery Optimization

## Problems Identified

### 1. Zoom Limitations

**Issue**: When using scroll/pinch zoom, cannot zoom out far enough to see entire 100x100 cemetery. Toolbar zoom buttons work better.

**Root Cause**: The `handleWheel` and pinch zoom handlers limit scale to `0.5 - 3.0`, with a minimum of `0.5`. For large cemeteries (100x100 = 4000x4000 pixels + padding), this minimum zoom is insufficient.

**Solution**: Make minimum zoom dynamic based on cemetery size to always allow viewing the entire cemetery.

### 2. Performance Issues

**Issue**: Map becomes sluggish with 100x100 grid (10,000 cells). Panning is choppy, placing markers is slow.

**Root Causes**:

- Rendering all 10,000+ cells for backgrounds, grid lines, and overlays
- No virtualization or culling of off-screen elements
- Every cell rendered even if empty
- Multiple SVG groups for backgrounds, grid lines, overlays all rendering full grid
- Graves/landmarks rendered even when zoomed out and not visible

**Solutions**:

1. Implement viewport culling - only render cells visible in current viewport
2. Use canvas for static elements (grid lines, backgrounds) with SVG overlay for interactive elements
3. Add memoization for expensive calculations
4. Reduce DOM elements by combining static elements
5. Implement level-of-detail (LOD) rendering - simplified view when zoomed out

### 3. Cemetery Size Limit

**Issue**: Cannot create cemeteries larger than 100x100, no feedback when trying.

**Root Cause**: Hard-coded validation in `CreateCemeteryModal.tsx` limits to 100x100 without explanation.

**Solution**:

1. Increase limit to reasonable size (e.g., 500x500 for 250,000 cells)
2. Add warning message for very large cemeteries about performance
3. Show calculated total cells and warn if > 50,000 cells

## Implementation Plan

### Phase 1: Quick Wins (Immediate)

1. Fix zoom limits to be dynamic
2. Increase cemetery size limit with warnings
3. Add performance optimizations (memoization improvements)

### Phase 2: Viewport Culling (High Priority)

1. Calculate visible cell range based on viewport and zoom
2. Only render cells within visible range + small buffer
3. Should handle cemeteries up to 500x500 smoothly

### Phase 3: Advanced Optimizations (Future)

1. Canvas-based rendering for static elements
2. Level-of-detail rendering
3. Web Worker for calculations
4. Spatial indexing for markers

## Technical Details

### Dynamic Zoom Calculation

```typescript
// Calculate minimum zoom to fit entire cemetery in viewport
const calculateMinZoom = (
  containerWidth: number,
  containerHeight: number,
  cemeteryWidth: number,
  cemeteryHeight: number
): number => {
  const zoomX = containerWidth / cemeteryWidth;
  const zoomY = containerHeight / cemeteryHeight;
  return Math.min(zoomX, zoomY) * 0.95; // 95% to add small margin
};
```

### Viewport Culling

```typescript
// Calculate visible cell range
const getVisibleCells = (
  transform: { x: number; y: number; scale: number },
  containerRect: DOMRect,
  cellSize: number,
  padding: number
) => {
  // Calculate viewport in SVG coordinates
  const viewportLeft = -transform.x / transform.scale;
  const viewportTop = -transform.y / transform.scale;
  const viewportRight = (containerRect.width - transform.x) / transform.scale;
  const viewportBottom = (containerRect.height - transform.y) / transform.scale;

  // Convert to cell coordinates with buffer
  const buffer = 2; // cells
  const minCol = Math.max(
    0,
    Math.floor((viewportLeft - padding) / cellSize) - buffer
  );
  const maxCol = Math.ceil((viewportRight - padding) / cellSize) + buffer;
  const minRow = Math.max(
    0,
    Math.floor((viewportTop - padding) / cellSize) - buffer
  );
  const maxRow = Math.ceil((viewportBottom - padding) / cellSize) + buffer;

  return { minRow, maxRow, minCol, maxCol };
};
```

## Performance Targets

| Cemetery Size           | Target Performance |
| ----------------------- | ------------------ |
| 10x10 (100 cells)       | Smooth 60fps       |
| 50x50 (2,500 cells)     | Smooth 60fps       |
| 100x100 (10,000 cells)  | Smooth 30fps+      |
| 200x200 (40,000 cells)  | Usable 20fps+      |
| 500x500 (250,000 cells) | Functional 15fps+  |

## Files to Modify

1. `src/components/MapGrid.tsx` - Main optimization work
2. `src/components/CreateCemeteryModal.tsx` - Size limits and warnings
3. `src/types/cemetery.ts` - Add performance-related types if needed

## Testing Checklist

- [ ] Create 100x100 cemetery - smooth performance
- [ ] Create 200x200 cemetery - acceptable performance
- [ ] Test zoom out to see full cemetery
- [ ] Test zoom in to individual cells
- [ ] Test panning while zoomed in/out
- [ ] Test placing graves/landmarks on large cemetery
- [ ] Test with many markers (100+)
- [ ] Test on mobile devices
- [ ] Test touch gestures
- [ ] Verify validation messages appear correctly
