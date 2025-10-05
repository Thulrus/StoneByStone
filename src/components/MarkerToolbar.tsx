import type { MarkerType } from '../types/cemetery';

interface MarkerToolbarProps {
  activeMarkerType: MarkerType | null;
  onSelectMarkerType: (type: MarkerType | null) => void;
  onFinishRoad?: () => void; // Callback when "Done" is clicked for road
  disabled?: boolean;
}

export function MarkerToolbar({
  activeMarkerType,
  onSelectMarkerType,
  onFinishRoad,
  disabled = false,
}: MarkerToolbarProps) {
  const handleMarkerClick = (type: MarkerType) => {
    // Toggle: if clicking the active type, deactivate it
    if (activeMarkerType === type) {
      onSelectMarkerType(null);
    } else {
      onSelectMarkerType(type);
    }
  };

  return (
    <div className="absolute bottom-4 left-4 z-[5] flex flex-col gap-2">
      {/* Grave Marker Button */}
      <button
        onClick={() => handleMarkerClick('grave')}
        disabled={disabled}
        className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          activeMarkerType === 'grave'
            ? 'bg-blue-600 text-white border-2 border-blue-700 ring-2 ring-blue-300'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Add grave marker"
        title="Click to add grave markers"
      >
        <span className="text-xl mr-2">🪦</span>
        <span>Add Grave</span>
      </button>

      {/* Landmark Marker Button */}
      <button
        onClick={() => handleMarkerClick('landmark')}
        disabled={disabled}
        className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          activeMarkerType === 'landmark'
            ? 'bg-blue-600 text-white border-2 border-blue-700 ring-2 ring-blue-300'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="Add landmark"
        title="Click to add landmarks (trees, benches, statues, etc.)"
      >
        <span className="text-xl mr-2">🌳</span>
        <span>Add Landmark</span>
      </button>

      {/* Road/Path Marker Button - changes to "Done" when active */}
      <button
        onClick={() =>
          activeMarkerType === 'street' && onFinishRoad
            ? onFinishRoad()
            : handleMarkerClick('street')
        }
        disabled={disabled}
        className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          activeMarkerType === 'street'
            ? 'bg-green-600 text-white border-2 border-green-700 ring-2 ring-green-300'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={
          activeMarkerType === 'street'
            ? 'Finish road/path'
            : 'Add road or path'
        }
        title={
          activeMarkerType === 'street'
            ? 'Click to finish and save road/path'
            : 'Click to add roads/paths'
        }
      >
        <span className="text-xl mr-2">
          {activeMarkerType === 'street' ? '✓' : '🛤️'}
        </span>
        <span>{activeMarkerType === 'street' ? 'Done' : 'Add Road/Path'}</span>
      </button>

      {/* Placeholder for future marker types - commented out for now */}
      {/* 
      <button
        onClick={() => handleMarkerClick('street')}
        disabled={disabled}
        className="..."
        aria-label="Add street"
        title="Add streets (coming soon)"
      >
        <span className="text-xl mr-2">🛣️</span>
        <span>Add Street</span>
      </button>
      */}

      {/* Active mode indicator */}
      {activeMarkerType && (
        <div className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg text-xs font-medium text-center">
          Click on map to place
          <br />
          <span className="text-[10px]">Press ESC to cancel</span>
        </div>
      )}
    </div>
  );
}
