import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import type {
  Grave,
  Landmark,
  Road,
  Cemetery,
  MarkerType,
  GridPosition,
} from '../types/cemetery';
import { colors } from '../lib/colors';

export interface MapGridRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface MapGridProps {
  cemetery: Cemetery;
  graves: Grave[];
  landmarks?: Landmark[];
  roads?: Road[];
  selectedRoadCells?: GridPosition[]; // Cells being selected for road
  selectedGrave: Grave | null;
  tempGrave?: Grave | null; // Temporary preview grave before saving
  tempLandmark?: Landmark | null; // Temporary preview landmark before saving
  listHighlightedGrave?: Grave | null; // Grave highlighted from list selection (shows floating label)
  onGraveClick: (grave: Grave) => void;
  onLandmarkClick?: (landmark: Landmark) => void;
  onRoadClick?: (road: Road) => void;
  highlightedGraves?: Set<string>;
  addMode?: MarkerType | null; // New prop for click-to-add mode
  onCellClick?: (position: GridPosition) => void; // New callback for cell clicks
  onMultipleElementsClick?: (
    elements: Array<{
      type: 'grave' | 'landmark' | 'road';
      data: Grave | Landmark | Road;
    }>,
    position: GridPosition
  ) => void; // New callback for multiple elements at same position
  // Grid shape editing props
  gridEditMode?: boolean;
  pendingValidCells?: Set<string>;
  onCellPaint?: (position: GridPosition) => void;
  // Zoom control callbacks
  zoomIn?: () => void;
  zoomOut?: () => void;
  resetView?: () => void;
}

const CELL_SIZE = 40;
const PADDING = 20;

// Memoized cell component for grid edit mode to prevent unnecessary re-renders
const GridEditCell = React.memo(
  ({
    row,
    col,
    isValid,
    isHovered,
    onMouseEnter,
    onMouseLeave,
    onClick,
  }: {
    row: number;
    col: number;
    isValid: boolean;
    isHovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onClick: (e: React.MouseEvent) => void;
  }) => {
    const x = PADDING + col * CELL_SIZE;
    const y = PADDING + row * CELL_SIZE;

    // Determine fill color based on validity and hover state
    let fillColor = 'transparent';
    let strokeColor = 'rgba(156, 163, 175, 0.3)';
    let strokeWidth = '1';

    if (isValid) {
      // Valid cell - green tint
      fillColor = isHovered
        ? 'rgba(34, 197, 94, 0.3)'
        : 'rgba(34, 197, 94, 0.1)';
      strokeColor = isHovered
        ? 'rgba(34, 197, 94, 0.8)'
        : 'rgba(34, 197, 94, 0.4)';
    } else {
      // Invalid cell - red tint with hatching pattern
      fillColor = isHovered
        ? 'rgba(239, 68, 68, 0.3)'
        : 'rgba(239, 68, 68, 0.15)';
      strokeColor = isHovered
        ? 'rgba(239, 68, 68, 0.8)'
        : 'rgba(239, 68, 68, 0.4)';
    }

    if (isHovered) {
      strokeWidth = '2';
    }

    return (
      <g key={`edit-cell-${row}-${col}`}>
        <rect
          x={x}
          y={y}
          width={CELL_SIZE}
          height={CELL_SIZE}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          className="cursor-pointer"
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onClick={onClick}
        />
        {/* Hatching pattern for invalid cells */}
        {!isValid && (
          <g>
            <line
              x1={x}
              y1={y}
              x2={x + CELL_SIZE}
              y2={y + CELL_SIZE}
              stroke="rgba(239, 68, 68, 0.3)"
              strokeWidth="1"
              pointerEvents="none"
            />
            <line
              x1={x + CELL_SIZE}
              y1={y}
              x2={x}
              y2={y + CELL_SIZE}
              stroke="rgba(239, 68, 68, 0.3)"
              strokeWidth="1"
              pointerEvents="none"
            />
          </g>
        )}
      </g>
    );
  }
);

GridEditCell.displayName = 'GridEditCell';

export const MapGrid = forwardRef<MapGridRef, MapGridProps>(function MapGrid(
  {
    cemetery,
    graves,
    landmarks = [],
    roads = [],
    selectedRoadCells = [],
    selectedGrave,
    tempGrave = null,
    tempLandmark = null,
    listHighlightedGrave = null,
    onGraveClick,
    onLandmarkClick,
    onRoadClick,
    highlightedGraves,
    addMode = null,
    onCellClick,
    onMultipleElementsClick,
    gridEditMode = false,
    pendingValidCells,
    onCellPaint,
  },
  ref
) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [lastTouchPos, setLastTouchPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(
    null
  );
  const [hoveredCell, setHoveredCell] = useState<GridPosition | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = cemetery.grid.cols * CELL_SIZE + PADDING * 2;
  const height = cemetery.grid.rows * CELL_SIZE + PADDING * 2;

  // Calculate dynamic minimum zoom based on cemetery size
  // This ensures you can always zoom out far enough to see the entire cemetery
  const calculateMinZoom = useCallback(() => {
    if (!svgRef.current) return 0.1;
    const containerRect = svgRef.current.getBoundingClientRect();
    const zoomX = containerRect.width / width;
    const zoomY = containerRect.height / height;
    // Use 95% of calculated zoom to add small margin
    return Math.min(zoomX, zoomY, 1) * 0.95;
  }, [width, height]);

  // Expose zoom methods to parent via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      setTransform((prev) => ({
        ...prev,
        scale: Math.min(prev.scale * 1.2, 5),
      }));
    },
    zoomOut: () => {
      setTransform((prev) => {
        const minZoom = calculateMinZoom();
        return { ...prev, scale: Math.max(prev.scale * 0.8, minZoom) };
      });
    },
    resetView: () => {
      setTransform({ x: 0, y: 0, scale: 1 });
    },
  }));

  // Memoized handler for grid edit cell painting
  const handleGridEditCellClick = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      e.stopPropagation();
      // Only toggle if we didn't drag (mouse didn't move significantly)
      if (mouseDownPos) {
        const dragDistance = Math.sqrt(
          Math.pow(e.clientX - mouseDownPos.x, 2) +
            Math.pow(e.clientY - mouseDownPos.y, 2)
        );
        // If mouse moved less than 5 pixels, treat it as a click
        if (dragDistance < 5) {
          onCellPaint?.({ row, col });
        }
      }
    },
    [mouseDownPos, onCellPaint]
  );

  // Handle clicking on a grid cell (for add mode)
  const handleCellClick = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      // Only place marker if we didn't drag (mouse didn't move significantly)
      if (addMode && onCellClick && mouseDownPos) {
        const dragDistance = Math.sqrt(
          Math.pow(e.clientX - mouseDownPos.x, 2) +
            Math.pow(e.clientY - mouseDownPos.y, 2)
        );
        // If mouse moved less than 5 pixels, treat it as a click
        if (dragDistance < 5) {
          onCellClick({ row, col });
        }
      }
    },
    [addMode, onCellClick, mouseDownPos]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Record mouse down position for click detection
      setMouseDownPos({ x: e.clientX, y: e.clientY });

      // Always allow dragging, regardless of what element is clicked
      if (e.button === 0) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - transform.x,
          y: e.clientY - transform.y,
        });
      }
    },
    [transform]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setTransform((prev) => ({
          ...prev,
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        }));
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // Clear mouse down position after a short delay to allow click handlers to fire
    setTimeout(() => setMouseDownPos(null), 0);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      if (!svgRef.current) return;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const minZoom = calculateMinZoom();
      const maxZoom = 5;
      const newScale = Math.max(
        minZoom,
        Math.min(maxZoom, transform.scale * delta)
      );

      // Get mouse position relative to the SVG element
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate the point in the transformed space
      const pointX = (mouseX - transform.x) / transform.scale;
      const pointY = (mouseY - transform.y) / transform.scale;

      // Calculate new transform to keep the point under the mouse
      const newX = mouseX - pointX * newScale;
      const newY = mouseY - pointY * newScale;

      setTransform({
        x: newX,
        y: newY,
        scale: newScale,
      });
    },
    [transform, calculateMinZoom]
  );

  // Touch event handlers
  const getTouchDistance = (touches: React.TouchList) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        // Single touch - start dragging (allow on all elements including graves)
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({
          x: touch.clientX - transform.x,
          y: touch.clientY - transform.y,
        });
        // Record touch start position for click detection
        setMouseDownPos({ x: touch.clientX, y: touch.clientY });
      } else if (e.touches.length === 2) {
        // Two touches - start pinch zoom
        setIsDragging(false);
        setLastTouchDistance(getTouchDistance(e.touches));
      }
    },
    [transform]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      if (!svgRef.current) return;

      if (e.touches.length === 1 && isDragging) {
        // Single touch - drag
        const touch = e.touches[0];
        setTransform((prev) => ({
          ...prev,
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y,
        }));
        // Track last touch position for drag detection
        setLastTouchPos({ x: touch.clientX, y: touch.clientY });
      } else if (e.touches.length === 2) {
        // Two touches - pinch zoom
        const currentDistance = getTouchDistance(e.touches);
        if (lastTouchDistance && transform) {
          const scaleDelta = currentDistance / lastTouchDistance;
          const minZoom = calculateMinZoom();
          const maxZoom = 5;
          const newScale = Math.max(
            minZoom,
            Math.min(maxZoom, transform.scale * scaleDelta)
          );

          // Get the center point between the two touches
          const rect = svgRef.current.getBoundingClientRect();
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
          const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;

          // Calculate the point in the transformed space
          const pointX = (centerX - transform.x) / transform.scale;
          const pointY = (centerY - transform.y) / transform.scale;

          // Calculate new transform to keep the center point stable
          const newX = centerX - pointX * newScale;
          const newY = centerY - pointY * newScale;

          setTransform({
            x: newX,
            y: newY,
            scale: newScale,
          });
        }
        setLastTouchDistance(currentDistance);
      }
    },
    [isDragging, dragStart, lastTouchDistance, transform, calculateMinZoom]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setLastTouchDistance(null);
    // Clear positions after a short delay to allow click handlers to fire and check for drag
    setTimeout(() => {
      setMouseDownPos(null);
      setLastTouchPos(null);
    }, 0);
  }, []);

  // Center view initially
  useEffect(() => {
    if (svgRef.current && transform.scale === 1 && transform.x === 0) {
      const containerRect = svgRef.current.getBoundingClientRect();
      setTransform({
        x: (containerRect.width - width) / 2,
        y: (containerRect.height - height) / 2,
        scale: 1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // Center view on list-highlighted grave
  useEffect(() => {
    if (listHighlightedGrave && svgRef.current) {
      const containerRect = svgRef.current.getBoundingClientRect();

      // Calculate grave's position in SVG coordinates
      const graveX =
        PADDING + listHighlightedGrave.grid.col * CELL_SIZE + CELL_SIZE / 2;
      const graveY =
        PADDING + listHighlightedGrave.grid.row * CELL_SIZE + CELL_SIZE / 2;

      // Calculate where to position the transform so grave is centered
      const targetX = containerRect.width / 2 - graveX * transform.scale;
      const targetY = containerRect.height / 2 - graveY * transform.scale;

      // Smoothly animate to the target position
      setTransform((prev) => ({
        ...prev,
        x: targetX,
        y: targetY,
      }));
    }
  }, [listHighlightedGrave, transform.scale]);

  // Calculate Level of Detail based on zoom level
  // This reduces DOM nodes when zoomed way out
  const lodLevel = useMemo(() => {
    if (transform.scale < 0.2) return 'minimal'; // Very zoomed out
    if (transform.scale < 0.5) return 'low'; // Zoomed out
    if (transform.scale < 1.5) return 'medium'; // Normal
    return 'high'; // Zoomed in
  }, [transform.scale]);

  // Calculate visible cell range for viewport culling
  // This dramatically improves performance for large cemeteries by only rendering visible cells
  const visibleCells = useMemo(() => {
    if (!svgRef.current) {
      // Return all cells if we can't calculate viewport
      return {
        minRow: 0,
        maxRow: cemetery.grid.rows - 1,
        minCol: 0,
        maxCol: cemetery.grid.cols - 1,
      };
    }

    const containerRect = svgRef.current.getBoundingClientRect();

    // Calculate viewport bounds in SVG coordinates
    const viewportLeft = -transform.x / transform.scale;
    const viewportTop = -transform.y / transform.scale;
    const viewportRight = (containerRect.width - transform.x) / transform.scale;
    const viewportBottom =
      (containerRect.height - transform.y) / transform.scale;

    // Convert to cell coordinates with buffer for smooth scrolling
    const buffer = 5; // cells outside viewport to render
    const minCol = Math.max(
      0,
      Math.floor((viewportLeft - PADDING) / CELL_SIZE) - buffer
    );
    const maxCol = Math.min(
      cemetery.grid.cols - 1,
      Math.ceil((viewportRight - PADDING) / CELL_SIZE) + buffer
    );
    const minRow = Math.max(
      0,
      Math.floor((viewportTop - PADDING) / CELL_SIZE) - buffer
    );
    const maxRow = Math.min(
      cemetery.grid.rows - 1,
      Math.ceil((viewportBottom - PADDING) / CELL_SIZE) + buffer
    );

    return { minRow, maxRow, minCol, maxCol };
  }, [
    cemetery.grid.rows,
    cemetery.grid.cols,
    transform.x,
    transform.y,
    transform.scale,
  ]);

  // Create grave lookup by grid position
  const gravesByPosition = useMemo(() => {
    const map = new Map<string, Grave[]>();
    graves.forEach((grave) => {
      if (!grave.properties.deleted) {
        const key = `${grave.grid.row},${grave.grid.col}`;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(grave);
      }
    });
    return map;
  }, [graves]);

  // Create landmark lookup by grid position
  const landmarksByPosition = useMemo(() => {
    const map = new Map<string, Landmark[]>();
    landmarks.forEach((landmark) => {
      if (!landmark.properties.deleted) {
        const key = `${landmark.grid.row},${landmark.grid.col}`;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(landmark);
      }
    });
    return map;
  }, [landmarks]);

  // Create road lookup by grid position
  const roadsByPosition = useMemo(() => {
    const map = new Map<string, Road[]>();
    roads.forEach((road) => {
      if (!road.properties.deleted) {
        road.cells.forEach((cell) => {
          const key = `${cell.row},${cell.col}`;
          if (!map.has(key)) {
            map.set(key, []);
          }
          map.get(key)!.push(road);
        });
      }
    });
    return map;
  }, [roads]);

  // Get all elements at a specific position
  const getElementsAtPosition = useCallback(
    (row: number, col: number) => {
      const key = `${row},${col}`;
      const elements: Array<{
        type: 'grave' | 'landmark' | 'road';
        data: Grave | Landmark | Road;
      }> = [];

      // Add roads first (lowest priority)
      const roadsAtPos = roadsByPosition.get(key) || [];
      roadsAtPos.forEach((road) => {
        elements.push({ type: 'road', data: road });
      });

      // Add graves
      const gravesAtPos = gravesByPosition.get(key) || [];
      gravesAtPos.forEach((grave) => {
        elements.push({ type: 'grave', data: grave });
      });

      // Add landmarks
      const landmarksAtPos = landmarksByPosition.get(key) || [];
      landmarksAtPos.forEach((landmark) => {
        elements.push({ type: 'landmark', data: landmark });
      });

      return elements;
    },
    [gravesByPosition, landmarksByPosition, roadsByPosition]
  );

  // Handle click on a marker (grave, landmark, or road)
  const handleMarkerClick = useCallback(
    (
      row: number,
      col: number,
      clickedElement: {
        type: 'grave' | 'landmark' | 'road';
        data: Grave | Landmark | Road;
      },
      e: React.MouseEvent
    ) => {
      // Check if this was a drag - if so, don't trigger selection
      if (mouseDownPos) {
        const dragDistance = Math.sqrt(
          Math.pow(e.clientX - mouseDownPos.x, 2) +
            Math.pow(e.clientY - mouseDownPos.y, 2)
        );
        // If mouse moved more than 5 pixels, it was a drag, not a click
        if (dragDistance >= 5) {
          return;
        }
      }

      // Also check for touch drag (lastTouchPos indicates touch was moved)
      if (lastTouchPos && mouseDownPos) {
        const touchDragDistance = Math.sqrt(
          Math.pow(lastTouchPos.x - mouseDownPos.x, 2) +
            Math.pow(lastTouchPos.y - mouseDownPos.y, 2)
        );
        // If touch moved more than 5 pixels, it was a drag, not a tap
        if (touchDragDistance >= 5) {
          return;
        }
      }

      // Don't interact during road selection mode
      if (addMode === 'street') return;

      const allElements = getElementsAtPosition(row, col);

      // If multiple elements exist at this position, show selection modal
      if (allElements.length > 1 && onMultipleElementsClick) {
        onMultipleElementsClick(allElements, { row, col });
      } else {
        // Single element, trigger the appropriate handler
        switch (clickedElement.type) {
          case 'grave':
            onGraveClick(clickedElement.data as Grave);
            break;
          case 'landmark':
            onLandmarkClick?.(clickedElement.data as Landmark);
            break;
          case 'road':
            onRoadClick?.(clickedElement.data as Road);
            break;
        }
      }
    },
    [
      addMode,
      mouseDownPos,
      lastTouchPos,
      getElementsAtPosition,
      onGraveClick,
      onLandmarkClick,
      onRoadClick,
      onMultipleElementsClick,
    ]
  );

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900 overflow-hidden relative">
      <svg
        ref={svgRef}
        className={`w-full h-full touch-none ${
          isDragging
            ? 'cursor-grabbing'
            : addMode
              ? 'cursor-crosshair'
              : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <g
          transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
        >
          {/* Valid cells background (grass green) - skip individual cells when zoomed way out */}
          <g className="valid-cells-background">
            {lodLevel === 'minimal' ? (
              // When zoomed way out, render one big rect instead of individual cells
              <rect
                x={PADDING}
                y={PADDING}
                width={cemetery.grid.cols * CELL_SIZE}
                height={cemetery.grid.rows * CELL_SIZE}
                fill="#86efac"
                opacity={0.3}
              />
            ) : (
              // Normal: render individual cells
              Array.from({
                length: visibleCells.maxRow - visibleCells.minRow + 1,
              }).map((_, idx) => {
                const row = visibleCells.minRow + idx;
                return Array.from({
                  length: visibleCells.maxCol - visibleCells.minCol + 1,
                }).map((_, jdx) => {
                  const col = visibleCells.minCol + jdx;
                  const cellKey = `${row},${col}`;
                  const isValid = cemetery.grid.validCells
                    ? cemetery.grid.validCells.has(cellKey)
                    : true; // All cells valid if no validCells defined

                  if (!isValid) return null; // Don't render invalid cells

                  const x = PADDING + col * CELL_SIZE;
                  const y = PADDING + row * CELL_SIZE;

                  return (
                    <rect
                      key={`bg-${row}-${col}`}
                      x={x}
                      y={y}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      fill="#86efac"
                      opacity={0.3}
                    />
                  );
                });
              })
            )}
          </g>

          {/* Grid lines - only render visible lines and clip to viewport */}
          <g className="grid-lines">
            {/* Horizontal lines - clipped to visible columns */}
            {lodLevel !== 'minimal' &&
              Array.from({
                length: visibleCells.maxRow - visibleCells.minRow + 2,
              }).map((_, idx) => {
                const i = visibleCells.minRow + idx;
                if (i > cemetery.grid.rows) return null;
                // Clip line to visible columns for performance
                const x1 = PADDING + visibleCells.minCol * CELL_SIZE;
                const x2 = PADDING + (visibleCells.maxCol + 1) * CELL_SIZE;
                return (
                  <line
                    key={`h-${i}`}
                    x1={x1}
                    y1={PADDING + i * CELL_SIZE}
                    x2={x2}
                    y2={PADDING + i * CELL_SIZE}
                    stroke="#9ca3af"
                    strokeWidth="1"
                    opacity={lodLevel === 'low' ? 0.5 : 1}
                  />
                );
              })}
            {/* Vertical lines - clipped to visible rows */}
            {lodLevel !== 'minimal' &&
              Array.from({
                length: visibleCells.maxCol - visibleCells.minCol + 2,
              }).map((_, idx) => {
                const i = visibleCells.minCol + idx;
                if (i > cemetery.grid.cols) return null;
                // Clip line to visible rows for performance
                const y1 = PADDING + visibleCells.minRow * CELL_SIZE;
                const y2 = PADDING + (visibleCells.maxRow + 1) * CELL_SIZE;
                return (
                  <line
                    key={`v-${i}`}
                    x1={PADDING + i * CELL_SIZE}
                    y1={y1}
                    x2={PADDING + i * CELL_SIZE}
                    y2={y2}
                    stroke="#9ca3af"
                    strokeWidth="1"
                    opacity={lodLevel === 'low' ? 0.5 : 1}
                  />
                );
              })}
          </g>

          {/* Invalid cells overlay (show in normal view when cemetery has custom shape) - skip when zoomed way out */}
          {!gridEditMode &&
            cemetery.grid.validCells &&
            lodLevel !== 'minimal' && (
              <g className="invalid-cells-overlay">
                {Array.from({
                  length: visibleCells.maxRow - visibleCells.minRow + 1,
                }).map((_, idx) => {
                  const row = visibleCells.minRow + idx;
                  return Array.from({
                    length: visibleCells.maxCol - visibleCells.minCol + 1,
                  }).map((_, jdx) => {
                    const col = visibleCells.minCol + jdx;
                    const cellKey = `${row},${col}`;
                    const isValid = cemetery.grid.validCells!.has(cellKey);

                    if (isValid) return null; // Don't render valid cells

                    const x = PADDING + col * CELL_SIZE;
                    const y = PADDING + row * CELL_SIZE;

                    return (
                      <rect
                        key={`invalid-cell-${row}-${col}`}
                        x={x}
                        y={y}
                        width={CELL_SIZE}
                        height={CELL_SIZE}
                        fill="#ef4444"
                        opacity={0.3}
                      />
                    );
                  });
                })}
              </g>
            )}

          {/* Row/Col labels - skip when zoomed way out (too small to read) */}
          {lodLevel !== 'minimal' && lodLevel !== 'low' && (
            <g className="labels text-xs fill-gray-600 dark:fill-gray-400">
              {Array.from({
                length: visibleCells.maxRow - visibleCells.minRow + 1,
              }).map((_, idx) => {
                const i = visibleCells.minRow + idx;
                return (
                  <text
                    key={`row-${i}`}
                    x={PADDING - 5}
                    y={PADDING + i * CELL_SIZE + CELL_SIZE / 2}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize="10"
                  >
                    {i}
                  </text>
                );
              })}
              {Array.from({
                length: visibleCells.maxCol - visibleCells.minCol + 1,
              }).map((_, idx) => {
                const i = visibleCells.minCol + idx;
                return (
                  <text
                    key={`col-${i}`}
                    x={PADDING + i * CELL_SIZE + CELL_SIZE / 2}
                    y={PADDING - 5}
                    textAnchor="middle"
                    dominantBaseline="auto"
                    fontSize="10"
                  >
                    {i}
                  </text>
                );
              })}
            </g>
          )}

          {/* Clickable cells (for add mode) - skip when zoomed way out for performance */}
          {addMode && lodLevel !== 'minimal' && (
            <g className="clickable-cells">
              {Array.from({
                length: visibleCells.maxRow - visibleCells.minRow + 1,
              }).map((_, idx) => {
                const row = visibleCells.minRow + idx;
                return Array.from({
                  length: visibleCells.maxCol - visibleCells.minCol + 1,
                }).map((_, jdx) => {
                  const col = visibleCells.minCol + jdx;
                  const x = PADDING + col * CELL_SIZE;
                  const y = PADDING + row * CELL_SIZE;
                  const isHovered =
                    hoveredCell?.row === row && hoveredCell?.col === col;
                  const hasGrave = gravesByPosition.has(`${row},${col}`);

                  return (
                    <rect
                      key={`cell-${row}-${col}`}
                      x={x}
                      y={y}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      fill={
                        isHovered
                          ? hasGrave
                            ? 'rgba(239, 68, 68, 0.2)' // Red if occupied
                            : 'rgba(59, 130, 246, 0.2)' // Blue if empty
                          : 'transparent'
                      }
                      stroke={isHovered ? '#3b82f6' : 'transparent'}
                      strokeWidth="2"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoveredCell({ row, col })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={(e) => handleCellClick(row, col, e)}
                    />
                  );
                });
              })}
            </g>
          )}

          {/* Grid shape editing overlay - only render visible cells, skip when zoomed way out */}
          {gridEditMode && lodLevel !== 'minimal' && (
            <g className="grid-edit-overlay">
              {Array.from({
                length: visibleCells.maxRow - visibleCells.minRow + 1,
              }).map((_, idx) => {
                const row = visibleCells.minRow + idx;
                return Array.from({
                  length: visibleCells.maxCol - visibleCells.minCol + 1,
                }).map((_, jdx) => {
                  const col = visibleCells.minCol + jdx;
                  const cellKey = `${row},${col}`;
                  const isHovered =
                    hoveredCell?.row === row && hoveredCell?.col === col;

                  // Check if cell is valid in pending state
                  const isValidInPending = pendingValidCells
                    ? pendingValidCells.has(cellKey)
                    : cemetery.grid.validCells
                      ? cemetery.grid.validCells.has(cellKey)
                      : true; // Default to valid if no validCells set

                  return (
                    <GridEditCell
                      key={`edit-cell-${row}-${col}`}
                      row={row}
                      col={col}
                      isValid={isValidInPending}
                      isHovered={isHovered}
                      onMouseEnter={() => setHoveredCell({ row, col })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={(e) => handleGridEditCellClick(row, col, e)}
                    />
                  );
                });
              })}
            </g>
          )}

          {/* Roads/Paths - render FIRST so they appear underneath other elements */}
          {roads
            .filter((road) => !road.properties.deleted)
            .map((road) => {
              // Use the road's color or default to gray
              const roadColor = road.properties.color || '#9ca3af';
              // Convert hex to rgba with 40% opacity for fill
              const hexToRgba = (hex: string, alpha: number) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
              };

              return (
                <g key={road.uuid} className="road-overlay">
                  {road.cells.map((cell, idx) => {
                    const x = PADDING + cell.col * CELL_SIZE;
                    const y = PADDING + cell.row * CELL_SIZE;

                    return (
                      <rect
                        key={`road-${road.uuid}-${idx}`}
                        x={x}
                        y={y}
                        width={CELL_SIZE}
                        height={CELL_SIZE}
                        fill={hexToRgba(roadColor, 0.4)}
                        stroke={hexToRgba(roadColor, 0.7)}
                        strokeWidth="2"
                        className="cursor-pointer"
                        style={{
                          pointerEvents: addMode === 'street' ? 'none' : 'auto',
                        }}
                        onClick={(e) =>
                          handleMarkerClick(
                            cell.row,
                            cell.col,
                            {
                              type: 'road',
                              data: road,
                            },
                            e
                          )
                        }
                      />
                    );
                  })}
                  <title>{road.properties.name || 'Road/Path'}</title>
                </g>
              );
            })}

          {/* Graves */}
          {Array.from(gravesByPosition.entries()).map(([key, gravesAtPos]) => {
            const [row, col] = key.split(',').map(Number);
            const x = PADDING + col * CELL_SIZE;
            const y = PADDING + row * CELL_SIZE;

            // Handle multiple graves at same position
            return gravesAtPos.map((grave, idx) => {
              const isSelected = selectedGrave?.uuid === grave.uuid;
              const isHighlighted = highlightedGraves?.has(grave.uuid);
              const hasConflict = gravesAtPos.length > 1;

              const offsetX = idx * 3;
              const offsetY = idx * 3;

              const stoneIconPath = `${import.meta.env.BASE_URL}stone.png`;

              return (
                <g
                  key={grave.uuid}
                  className="grave-marker cursor-pointer"
                  style={{
                    pointerEvents: addMode === 'street' ? 'none' : 'auto',
                  }}
                  onClick={(e) => {
                    // Don't interact with graves during road selection mode
                    if (addMode === 'street') return;
                    handleMarkerClick(
                      row,
                      col,
                      { type: 'grave', data: grave },
                      e
                    );
                  }}
                >
                  {/* Base stone icon */}
                  <image
                    href={stoneIconPath}
                    x={x + 5 + offsetX}
                    y={y + 5 + offsetY}
                    width={30}
                    height={30}
                  />
                  {/* Color overlay for state indication */}
                  <rect
                    x={x + 5 + offsetX}
                    y={y + 5 + offsetY}
                    width={30}
                    height={30}
                    fill={
                      isSelected
                        ? 'rgba(59, 130, 246, 0.3)'
                        : hasConflict
                          ? 'rgba(239, 68, 68, 0.3)'
                          : isHighlighted
                            ? 'rgba(16, 185, 129, 0.3)'
                            : 'transparent'
                    }
                    pointerEvents="none"
                  />
                  {/* Tooltip on hover */}
                  <title>
                    {grave.properties.name ||
                      `Grave at (${grave.grid.row}, ${grave.grid.col})`}
                  </title>
                </g>
              );
            });
          })}

          {/* Landmarks */}
          {landmarks
            .filter((landmark) => !landmark.properties.deleted)
            .map((landmark) => {
              const x = PADDING + landmark.grid.col * CELL_SIZE;
              const y = PADDING + landmark.grid.row * CELL_SIZE;

              // Map landmark type to icon filename
              const iconMap: Record<string, string> = {
                bench: 'bench.png',
                tree: 'tree.png',
                pine: 'pine.png',
                building: 'building.png',
                statue: 'statue.png',
                other: 'other.png',
              };
              const iconFile = iconMap[landmark.landmark_type] || 'other.png';
              const iconPath = `${import.meta.env.BASE_URL}${iconFile}`;

              return (
                <g
                  key={landmark.uuid}
                  className="landmark-marker cursor-pointer"
                  style={{
                    pointerEvents: addMode === 'street' ? 'none' : 'auto',
                  }}
                  onClick={(e) => {
                    // Don't interact with landmarks during road selection mode
                    if (addMode === 'street') return;
                    handleMarkerClick(
                      landmark.grid.row,
                      landmark.grid.col,
                      {
                        type: 'landmark',
                        data: landmark,
                      },
                      e
                    );
                  }}
                >
                  <image
                    href={iconPath}
                    x={x + 5}
                    y={y + 5}
                    width={30}
                    height={30}
                  />
                  {/* Tooltip on hover */}
                  <title>
                    {landmark.properties.name ||
                      `${landmark.landmark_type} landmark`}
                  </title>
                </g>
              );
            })}

          {/* Temporary preview grave (before saving) */}
          {tempGrave && (
            <g key={`temp-${tempGrave.uuid}`} className="temp-grave-marker">
              {(() => {
                const x = PADDING + tempGrave.grid.col * CELL_SIZE;
                const y = PADDING + tempGrave.grid.row * CELL_SIZE;
                const stoneIconPath = `${import.meta.env.BASE_URL}stone.png`;

                return (
                  <>
                    <image
                      href={stoneIconPath}
                      x={x + 5}
                      y={y + 5}
                      width={30}
                      height={30}
                      opacity={0.7}
                    />
                    {/* Blue overlay to indicate temporary state */}
                    <rect
                      x={x + 5}
                      y={y + 5}
                      width={30}
                      height={30}
                      fill="rgba(59, 130, 246, 0.4)"
                      pointerEvents="none"
                    />
                    <title>New grave (unsaved)</title>
                  </>
                );
              })()}
            </g>
          )}

          {/* Temporary preview landmark (before saving) */}
          {tempLandmark && (
            <g
              key={`temp-${tempLandmark.uuid}`}
              className="temp-landmark-marker"
            >
              {(() => {
                const x = PADDING + tempLandmark.grid.col * CELL_SIZE;
                const y = PADDING + tempLandmark.grid.row * CELL_SIZE;

                // Map landmark type to icon filename
                const iconMap: Record<string, string> = {
                  bench: 'bench.png',
                  tree: 'tree.png',
                  pine: 'pine.png',
                  statue: 'statue.png',
                  building: 'building.png',
                  other: 'other.png',
                };
                const iconPath = `${import.meta.env.BASE_URL}${iconMap[tempLandmark.landmark_type] || 'other.png'}`;

                return (
                  <>
                    <image
                      href={iconPath}
                      x={x + 5}
                      y={y + 5}
                      width={30}
                      height={30}
                      opacity={0.7}
                    />
                    {/* Blue overlay to indicate temporary state */}
                    <rect
                      x={x + 5}
                      y={y + 5}
                      width={30}
                      height={30}
                      fill="rgba(59, 130, 246, 0.4)"
                      pointerEvents="none"
                    />
                    <title>New {tempLandmark.landmark_type} (unsaved)</title>
                  </>
                );
              })()}
            </g>
          )}

          {/* Floating label for list-highlighted grave */}
          {listHighlightedGrave && (
            <g key={`highlight-${listHighlightedGrave.uuid}`}>
              {(() => {
                const x = PADDING + listHighlightedGrave.grid.col * CELL_SIZE;
                const y = PADDING + listHighlightedGrave.grid.row * CELL_SIZE;

                // Position label above the grave icon
                const labelX = x + 20; // Center of cell
                const labelY = y - 10; // Above the cell

                const displayName =
                  listHighlightedGrave.properties.name || 'Unnamed';
                const labelWidth = Math.max(displayName.length * 7 + 20, 100); // Approximate width

                return (
                  <>
                    {/* Pulsing ring around grave */}
                    <circle
                      cx={x + 20}
                      cy={y + 20}
                      r={22}
                      fill="none"
                      stroke={colors.highlight.yellow.ring}
                      strokeWidth={3}
                      pointerEvents="none"
                    >
                      <animate
                        attributeName="r"
                        values="22;28;22"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.8;0.3;0.8"
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>

                    {/* Floating label background */}
                    <rect
                      x={labelX - labelWidth / 2}
                      y={labelY - 20}
                      width={labelWidth}
                      height={28}
                      rx={4}
                      fill={colors.highlight.yellow.light}
                      stroke={colors.highlight.yellow.border}
                      strokeWidth={2}
                      pointerEvents="none"
                    />

                    {/* Label text */}
                    <text
                      x={labelX}
                      y={labelY - 4}
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight="600"
                      fill={colors.text.dark}
                      pointerEvents="none"
                    >
                      {displayName}
                    </text>

                    {/* Small pointer arrow from label to grave */}
                    <path
                      d={`M ${labelX - 4} ${labelY + 8} L ${labelX + 4} ${labelY + 8} L ${labelX} ${labelY + 12} Z`}
                      fill={colors.highlight.yellow.light}
                      pointerEvents="none"
                    />
                  </>
                );
              })()}
            </g>
          )}

          {/* Selected road cells during placement */}
          {addMode === 'street' &&
            selectedRoadCells.map((cell, idx) => {
              const x = PADDING + cell.col * CELL_SIZE;
              const y = PADDING + cell.row * CELL_SIZE;

              return (
                <rect
                  key={`selected-road-cell-${idx}`}
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  fill="rgba(59, 130, 246, 0.4)" // Blue overlay for selection
                  stroke="rgba(37, 99, 235, 0.8)"
                  strokeWidth="2"
                  pointerEvents="none"
                />
              );
            })}
        </g>
      </svg>
    </div>
  );
});
