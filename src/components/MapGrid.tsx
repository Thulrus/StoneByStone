import React, { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Grave,
  Cemetery,
  MarkerType,
  GridPosition,
} from '../types/cemetery';

interface MapGridProps {
  cemetery: Cemetery;
  graves: Grave[];
  selectedGrave: Grave | null;
  onGraveClick: (grave: Grave) => void;
  highlightedGraves?: Set<string>;
  addMode?: MarkerType | null; // New prop for click-to-add mode
  onCellClick?: (position: GridPosition) => void; // New callback for cell clicks
}

const CELL_SIZE = 40;
const PADDING = 20;

export function MapGrid({
  cemetery,
  graves,
  selectedGrave,
  onGraveClick,
  highlightedGraves,
  addMode = null,
  onCellClick,
}: MapGridProps) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState<{
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

      if (
        e.button === 0 &&
        !(e.target as SVGElement).closest('.grave-marker')
      ) {
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
        // Single touch - start dragging
        const touch = e.touches[0];
        if (!(e.target as SVGElement).closest('.grave-marker')) {
          setIsDragging(true);
          setDragStart({
            x: touch.clientX - transform.x,
            y: touch.clientY - transform.y,
          });
        }
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
  const gravesByPosition = new Map<string, Grave[]>();
  graves.forEach((grave) => {
    if (!grave.properties.deleted) {
      const key = `${grave.grid.row},${grave.grid.col}`;
      if (!gravesByPosition.has(key)) {
        gravesByPosition.set(key, []);
      }
      gravesByPosition.get(key)!.push(grave);
    }
  });

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

              return (
                <g
                  key={grave.uuid}
                  className="grave-marker cursor-pointer"
                  onClick={() => onGraveClick(grave)}
                >
                  {/* Tombstone shape */}
                  <rect
                    x={x + 10 + offsetX}
                    y={y + 15 + offsetY}
                    width={15}
                    height={15}
                    rx="2"
                    fill={
                      isSelected
                        ? '#3b82f6'
                        : hasConflict
                          ? '#ef4444'
                          : isHighlighted
                            ? '#10b981'
                            : '#6b7280'
                    }
                    stroke={isSelected ? '#1e40af' : '#374151'}
                    strokeWidth="1"
                  />
                  <path
                    d={`M ${x + 10 + offsetX} ${y + 15 + offsetY} Q ${x + 17.5 + offsetX} ${y + 10 + offsetY}, ${x + 25 + offsetX} ${y + 15 + offsetY}`}
                    fill={
                      isSelected
                        ? '#3b82f6'
                        : hasConflict
                          ? '#ef4444'
                          : isHighlighted
                            ? '#10b981'
                            : '#6b7280'
                    }
                    stroke={isSelected ? '#1e40af' : '#374151'}
                    strokeWidth="1"
                  />
                  {/* Tooltip on hover */}
                  <title>{grave.properties.name || grave.plot}</title>
                </g>
              );
            });
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
