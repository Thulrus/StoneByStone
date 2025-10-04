interface ImportDataModalProps {
  isOpen: boolean;
  onMerge: () => void;
  onReplace: () => void;
  onCancel: () => void;
  incomingGraveCount: number;
  existingGraveCount: number;
  incomingCemeteryName: string;
  existingCemeteryName: string;
}

export function ImportDataModal({
  isOpen,
  onMerge,
  onReplace,
  onCancel,
  incomingGraveCount,
  existingGraveCount,
  incomingCemeteryName,
  existingCemeteryName,
}: ImportDataModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Import Cemetery Data
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Existing Data Detected
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  You already have cemetery data loaded. How would you like to
                  proceed?
                </p>
              </div>
            </div>
          </div>

          {/* Current State */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Current Data:
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <div>
                <span className="font-medium">Cemetery:</span>{' '}
                {existingCemeteryName}
              </div>
              <div>
                <span className="font-medium">Graves:</span>{' '}
                {existingGraveCount}
              </div>
            </div>
          </div>

          {/* Incoming Data */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              New Data to Import:
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <div>
                <span className="font-medium">Cemetery:</span>{' '}
                {incomingCemeteryName}
              </div>
              <div>
                <span className="font-medium">Graves:</span>{' '}
                {incomingGraveCount}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Choose an action:
            </h3>

            {/* Option 1: Merge */}
            <button
              onClick={onMerge}
              className="w-full text-left px-4 py-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔄</span>
                <div className="flex-1">
                  <div className="font-semibold text-green-900 dark:text-green-200 mb-1">
                    Merge Data
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Combine the new data with existing data. Conflicts will be
                    resolved by keeping the most recently modified version. Your
                    existing data will be preserved.
                  </div>
                </div>
              </div>
            </button>

            {/* Option 2: Replace */}
            <button
              onClick={onReplace}
              className="w-full text-left px-4 py-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">🗑️</span>
                <div className="flex-1">
                  <div className="font-semibold text-red-900 dark:text-red-200 mb-1">
                    Replace All Data
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <strong>Delete all existing data</strong> and replace it
                    with the new import. This action cannot be undone!
                  </div>
                </div>
              </div>
            </button>

            {/* Option 3: Cancel */}
            <button
              onClick={onCancel}
              className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">❌</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-200 mb-1">
                    Cancel Import
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-400">
                    Don't import anything. Keep only the existing data.
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
