import type { MarkerType } from '../types/cemetery';

interface MarkerToolbarProps {
  activeMarkerType: MarkerType | null;
  onSelectMarkerType: (type: MarkerType | null) => void;
  disabled?: boolean;
}

export function MarkerToolbar({
  activeMarkerType,
  onSelectMarkerType,
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
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
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

      {/* Placeholder for future marker types - commented out for now */}
      {/* 
      <button
        onClick={() => handleMarkerClick('landmark')}
        disabled={disabled}
        className="..."
        aria-label="Add landmark"
        title="Add landmarks (coming soon)"
      >
        <span className="text-xl mr-2">🌳</span>
        <span>Add Landmark</span>
      </button>

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
