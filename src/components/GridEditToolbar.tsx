interface GridEditToolbarProps {
  isActive: boolean;
  onToggleActive: () => void;
  onReset: () => void;
  onFinalize: () => void;
  onCancel: () => void;
  hasPendingChanges: boolean;
  disabled?: boolean;
}

export function GridEditToolbar({
  isActive,
  onToggleActive,
  onReset,
  onFinalize,
  onCancel,
  hasPendingChanges,
  disabled = false,
}: GridEditToolbarProps) {
  if (!isActive) {
    // Show only the "Edit Cemetery Shape" button when not active
    return (
      <div className="absolute top-4 right-4 z-[5]">
        <button
          onClick={onToggleActive}
          disabled={disabled}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-label="Edit cemetery shape"
          title="Click to edit cemetery boundaries"
        >
          <span className="text-xl mr-2">✏️</span>
          <span>Edit Shape</span>
        </button>
      </div>
    );
  }

  // Show full toolbar when active
  return (
    <div className="absolute top-4 right-4 z-[5] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-300 dark:border-gray-600 p-4">
      <div className="flex flex-col gap-3 min-w-[200px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Edit Cemetery Shape
          </h3>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900 p-2 rounded">
          🖱️ Click cells to toggle them in or out of the cemetery
        </div>

        {/* Status */}
        {hasPendingChanges && (
          <div className="text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <span>⚠️</span>
            <span>Unsaved changes</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          {hasPendingChanges && (
            <button
              onClick={onReset}
              className="w-full px-3 py-2 rounded-md text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              ↺ Reset Changes
            </button>
          )}
          <button
            onClick={onFinalize}
            disabled={!hasPendingChanges}
            className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              hasPendingChanges
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            ✓ Finalize Shape
          </button>
          <button
            onClick={onCancel}
            className="w-full px-3 py-2 rounded-md text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
