import { useState } from 'react';
import type { MarkerType } from '../types/cemetery';

interface MapToolbarProps {
  // Marker controls
  activeMarkerType: MarkerType | null;
  onSelectMarkerType: (type: MarkerType | null) => void;
  onFinishRoad?: () => void;

  // Grid controls
  isGridEditMode: boolean;
  onToggleGridEdit: () => void;
  onResetGridShape: () => void;
  onFinalizeGridShape: () => void;
  onCancelGridEdit: () => void;
  hasGridChanges: boolean;
  onOpenGridResize: () => void;

  // Zoom controls
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;

  // General state
  disabled?: boolean;
}

export function MapToolbar({
  activeMarkerType,
  onSelectMarkerType,
  onFinishRoad,
  isGridEditMode,
  onToggleGridEdit,
  onResetGridShape,
  onFinalizeGridShape,
  onCancelGridEdit,
  hasGridChanges,
  onOpenGridResize,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  disabled = false,
}: MapToolbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleMarkerClick = (type: MarkerType) => {
    if (activeMarkerType === type) {
      onSelectMarkerType(null);
    } else {
      onSelectMarkerType(type);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[5] bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 shadow-lg">
      {/* Collapsed State - Minimal Bar */}
      {isCollapsed && (
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Map Tools
          </span>
          <button
            onClick={() => setIsCollapsed(false)}
            className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Expand toolbar"
          >
            <span className="text-lg">↑</span>
          </button>
        </div>
      )}

      {/* Expanded State - Full Toolbar */}
      {!isCollapsed && (
        <div className="flex flex-col">
          {/* Collapse Button Row */}
          <div className="flex items-center justify-between px-4 py-1 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Map Tools
            </span>
            <button
              onClick={() => setIsCollapsed(true)}
              className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Collapse toolbar"
            >
              <span className="text-lg">↓</span>
            </button>
          </div>

          {/* Toolbar Content */}
          <div className="flex flex-wrap items-center justify-between px-4 py-2 gap-x-4 gap-y-2">
            {/* Left Section: Add Elements */}
            {!isGridEditMode && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                  ADD:
                </span>
                <button
                  onClick={() => handleMarkerClick('grave')}
                  disabled={disabled}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeMarkerType === 'grave'
                      ? 'bg-blue-600 text-white border-2 border-blue-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Click to add grave markers"
                >
                  <span className="mr-1">🪦</span>
                  Grave
                </button>

                <button
                  onClick={() => handleMarkerClick('landmark')}
                  disabled={disabled}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeMarkerType === 'landmark'
                      ? 'bg-blue-600 text-white border-2 border-blue-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Click to add landmarks (trees, benches, statues)"
                >
                  <span className="mr-1">🌳</span>
                  Landmark
                </button>

                <button
                  onClick={() =>
                    activeMarkerType === 'street' && onFinishRoad
                      ? onFinishRoad()
                      : handleMarkerClick('street')
                  }
                  disabled={disabled}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeMarkerType === 'street'
                      ? 'bg-green-600 text-white border-2 border-green-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={
                    activeMarkerType === 'street'
                      ? 'Click to finish and save road/path'
                      : 'Click to add roads/paths'
                  }
                >
                  <span className="mr-1">
                    {activeMarkerType === 'street' ? '✓' : '🛤️'}
                  </span>
                  {activeMarkerType === 'street' ? 'Done' : 'Road/Path'}
                </button>
              </div>
            )}

            {/* Grid Edit Mode Controls */}
            {isGridEditMode && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                  EDITING SHAPE:
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Click cells to toggle
                </span>
                {hasGridChanges && (
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <span>⚠️</span>
                    Unsaved changes
                  </span>
                )}
                <button
                  onClick={onResetGridShape}
                  disabled={!hasGridChanges}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    hasGridChanges
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  ↺ Reset
                </button>
                <button
                  onClick={onFinalizeGridShape}
                  disabled={!hasGridChanges}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    hasGridChanges
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  ✓ Finalize
                </button>
                <button
                  onClick={onCancelGridEdit}
                  className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all whitespace-nowrap"
                >
                  ✕ Cancel
                </button>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1 min-w-[1rem]" />

            {/* Center/Right Section: Grid & View Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                GRID:
              </span>
              <button
                onClick={onToggleGridEdit}
                disabled={disabled}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  isGridEditMode
                    ? 'bg-blue-600 text-white border-2 border-blue-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Edit cemetery shape"
              >
                <span className="mr-1">✏️</span>
                Edit Shape
              </button>

              {!isGridEditMode && (
                <button
                  onClick={onOpenGridResize}
                  disabled={disabled}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Resize cemetery grid"
                >
                  <span className="mr-1">⊞</span>
                  Resize
                </button>
              )}

              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                VIEW:
              </span>
              <button
                onClick={onZoomIn}
                className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                title="Zoom in"
              >
                +
              </button>
              <button
                onClick={onZoomOut}
                className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                title="Zoom out"
              >
                −
              </button>
              <button
                onClick={onResetZoom}
                className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all whitespace-nowrap"
                title="Reset view"
              >
                ↻ Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
