import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import type {
  Grave,
  Landmark,
  Road,
  Cemetery,
  MarkerType,
  GridPosition,
} from '../types/cemetery';

interface MapGridProps {
  cemetery: Cemetery;
  graves: Grave[];
  landmarks?: Landmark[];
  roads?: Road[];
  selectedRoadCells?: GridPosition[]; // Cells being selected for road
  selectedGrave: Grave | null;
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
}

const CELL_SIZE = 40;
const PADDING = 20;

export function MapGrid({
  cemetery,
  graves,
  landmarks = [],
  roads = [],
  selectedRoadCells = [],
  selectedGrave,
  onGraveClick,
  onLandmarkClick,
  onRoadClick,
  highlightedGraves,
  addMode = null,
  onCellClick,
  onMultipleElementsClick,
}: MapGridProps) {
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
      const newScale = Math.max(0.5, Math.min(3, transform.scale * delta));

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
    [transform]
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
          const newScale = Math.max(
            0.5,
            Math.min(3, transform.scale * scaleDelta)
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
    [isDragging, dragStart, lastTouchDistance, transform]
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
          {/* Grid lines */}
          <g className="grid-lines">
            {Array.from({ length: cemetery.grid.rows + 1 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1={PADDING}
                y1={PADDING + i * CELL_SIZE}
                x2={PADDING + cemetery.grid.cols * CELL_SIZE}
                y2={PADDING + i * CELL_SIZE}
                stroke="#cbd5e0"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: cemetery.grid.cols + 1 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={PADDING + i * CELL_SIZE}
                y1={PADDING}
                x2={PADDING + i * CELL_SIZE}
                y2={PADDING + cemetery.grid.rows * CELL_SIZE}
                stroke="#cbd5e0"
                strokeWidth="1"
              />
            ))}
          </g>

          {/* Row/Col labels */}
          <g className="labels text-xs fill-gray-600 dark:fill-gray-400">
            {Array.from({ length: cemetery.grid.rows }).map((_, i) => (
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
            ))}
            {Array.from({ length: cemetery.grid.cols }).map((_, i) => (
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
            ))}
          </g>

          {/* Clickable cells (for add mode) */}
          {addMode && (
            <g className="clickable-cells">
              {Array.from({ length: cemetery.grid.rows }).map((_, row) =>
                Array.from({ length: cemetery.grid.cols }).map((_, col) => {
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
                })
              )}
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

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() =>
            setTransform((prev) => ({ ...prev, scale: prev.scale * 1.2 }))
          }
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow text-sm"
        >
          +
        </button>
        <button
          onClick={() =>
            setTransform((prev) => ({ ...prev, scale: prev.scale * 0.8 }))
          }
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow text-sm"
        >
          −
        </button>
        <button
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow text-sm"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
