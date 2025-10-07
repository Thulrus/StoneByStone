# Performance Analysis: Why Is Zoomed-Out View Still Slow?

## The Hidden Performance Killers

### 1. Grid Lines Span Full Cemetery ❌

**Current Issue**: Even with viewport culling, grid lines extend from one edge of the cemetery to the other.

- 200×200 cemetery = 8000×8000 pixel grid
- Each horizontal line: 8000 pixels wide
- Each vertical line: 8000 pixels tall
- When zoomed out 10x, browser still has to render and transform these massive lines

**Fix**: Clip grid lines to only span visible viewport

### 2. SVG Rendering Overhead

**The Core Problem**: SVG is great for scalability but has significant overhead:

- Each element (rect, line, text) is a DOM node
- Browser must compute CSS classes for each element
- `className` attribute causes style recalculation
- `currentColor` requires inheritance resolution
- Transform matrix applied to every single element
- Even "simple" shapes have parsing and rendering costs

**Numbers**:

- 100×100 cemetery with 500 visible cells
- Each cell = 1 rect element = 1 DOM node
- 500 cells + 100 lines + 100 labels = **700+ DOM nodes**
- Plus CSS class resolution for each
- Plus transform calculation for each
- Plus paint/composite for each

### 3. The Scale Factor Multiplier

When zoomed out to 0.1x scale to see whole cemetery:

- Browser must scale 8000×8000 pixel canvas
- All elements must be transformed
- Tiny 40×40 cells become 4×4 pixels but browser still does full calculation
- Antialiasing and subpixel rendering still applied

### 4. React Re-render Overhead

- Pan/zoom causes transform state change
- State change triggers React re-render
- `visibleCells` recalculates (this is fast)
- But React still diffs 700+ element virtual DOM
- Then browser repaints everything

## Why Simple Shapes Are Actually Expensive

A "simple" grid cell isn't simple:

```tsx
<rect
  key={`bg-${row}-${col}`} // String concatenation
  x={x} // Prop
  y={y} // Prop
  width={CELL_SIZE} // Prop
  height={CELL_SIZE} // Prop
  className="fill-cemetery-grass-light dark:fill-cemetery-grass-dark" // CSS lookup + media query
  pointerEvents="none" // Prop
/>
```

Browser must:

1. Parse JSX → Create VNode
2. React diff → Decide update needed
3. Create/update DOM node
4. Resolve CSS classes (2 classes, media query)
5. Compute fill color from theme
6. Apply transform matrix from parent
7. Compute final screen coordinates
8. Rasterize shape
9. Composite with other layers

**Per cell!** × 500 cells = heavy CPU work

## Solutions (In Priority Order)

### Level 1: Reduce DOM Nodes When Zoomed Out 🔥

When scale < 0.3 (zoomed way out), use **Level of Detail (LOD)**:

- Don't render individual cell backgrounds
- Instead render one big rect for entire visible area
- Skip row/col labels (too small to read anyway)
- Simplify grid lines (every 5th or 10th line only)
- Still render markers (graves, landmarks) but simplified

**Impact**: 700 DOM nodes → 50 DOM nodes when zoomed out

### Level 2: Optimize Grid Line Rendering 🔥

- Clip lines to visible viewport only
- Lines should only span visible columns/rows
- No 8000px lines when viewing 800px viewport

**Impact**: Massive geometry reduction

### Level 3: CSS Optimization ⚡

- Replace `className` with inline `fill` attribute (skip CSS resolution)
- Remove `currentColor` (forces inheritance lookup)
- Use solid color values
- Cache computed colors

**Impact**: ~30% faster style calculation

### Level 4: Canvas Fallback (Advanced) 🚀

For very large cemeteries (>50,000 cells):

- Render grid/background to canvas element
- Only use SVG for interactive markers
- Canvas is raster-based, much faster for static content
- Redraw canvas only when viewport changes

**Impact**: 10x+ performance improvement for large grids

### Level 5: Virtualization + Caching (Advanced) 🚀

- Don't recalculate `visibleCells` on every frame
- Throttle viewport calculations
- Cache rendered chunks
- Use `requestAnimationFrame` for smooth updates

## Recommended Implementation

I'll implement Levels 1 & 2 now (quick wins):

### Level of Detail System

```typescript
const lodLevel = useMemo(() => {
  if (transform.scale < 0.2) return 'minimal'; // Very zoomed out
  if (transform.scale < 0.5) return 'low'; // Zoomed out
  if (transform.scale < 1.5) return 'medium'; // Normal
  return 'high'; // Zoomed in
}, [transform.scale]);
```

Then conditionally render:

- **Minimal**: One background rect, no labels, sparse grid lines, simplified markers
- **Low**: Background cells, sparse labels, normal markers
- **Medium**: Full cells, all labels, full grid
- **High**: Everything including hover effects

### Clipped Grid Lines

Calculate viewport-relative line coordinates instead of full cemetery span.

## Expected Results

| Zoom Level        | Before        | After         | Improvement    |
| ----------------- | ------------- | ------------- | -------------- |
| 1x (normal)       | 700 DOM nodes | 700 DOM nodes | Same           |
| 0.5x              | 700 DOM nodes | 400 DOM nodes | 1.75x faster   |
| 0.2x (zoomed out) | 700 DOM nodes | 50 DOM nodes  | **14x faster** |

Panning at 0.2x zoom should go from choppy (15 fps) to smooth (60 fps).
