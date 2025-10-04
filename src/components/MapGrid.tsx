import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Grave, Cemetery } from '../types/cemetery';

interface MapGridProps {
  cemetery: Cemetery;
  graves: Grave[];
  selectedGrave: Grave | null;
  onGraveClick: (grave: Grave) => void;
  highlightedGraves?: Set<string>;
}

const CELL_SIZE = 40;
const PADDING = 20;

export function MapGrid({
  cemetery,
  graves,
  selectedGrave,
  onGraveClick,
  highlightedGraves,
}: MapGridProps) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const width = cemetery.grid.cols * CELL_SIZE + PADDING * 2;
  const height = cemetery.grid.rows * CELL_SIZE + PADDING * 2;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale * delta)),
    }));
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
        className="w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
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
