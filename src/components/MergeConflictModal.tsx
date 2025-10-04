import { useState } from 'react';
import type { MergeConflict, ConflictResolution } from '../types/cemetery';

interface MergeConflictModalProps {
  conflicts: MergeConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
}

export function MergeConflictModal({
  conflicts,
  onResolve,
  onCancel,
}: MergeConflictModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(
    new Map()
  );

  const currentConflict = conflicts[currentIndex];
  const conflictKey = `${currentConflict.uuid}-${currentConflict.field}`;

  const handleResolve = (
    choice: 'local' | 'incoming' | 'manual',
    manualValue?: unknown
  ) => {
    const resolution: ConflictResolution = {
      uuid: currentConflict.uuid,
      field: currentConflict.field,
      resolvedValue:
        choice === 'local'
          ? currentConflict.localValue
          : choice === 'incoming'
          ? currentConflict.incomingValue
          : manualValue,
      resolution: choice,
    };

    const newResolutions = new Map(resolutions);
    newResolutions.set(conflictKey, resolution);
    setResolutions(newResolutions);

    if (currentIndex < conflicts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleFinish = () => {
    onResolve(Array.from(resolutions.values()));
  };

  const allResolved = resolutions.size === conflicts.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Resolve Merge Conflicts
          </h2>

          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Conflict {currentIndex + 1} of {conflicts.length}
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Field: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{currentConflict.field}</code>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                UUID: {currentConflict.uuid}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  Local Value
                </div>
                <div className="text-sm text-gray-900 dark:text-white mb-2">
                  {JSON.stringify(currentConflict.localValue, null, 2)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Modified: {new Date(currentConflict.localTimestamp).toLocaleString()}
                  <br />
                  By: {currentConflict.localModifiedBy}
                </div>
                <button
                  onClick={() => handleResolve('local')}
                  className="mt-3 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
                >
                  Use Local
                </button>
              </div>

              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <div className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
                  Incoming Value
                </div>
                <div className="text-sm text-gray-900 dark:text-white mb-2">
                  {JSON.stringify(currentConflict.incomingValue, null, 2)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Modified: {new Date(currentConflict.incomingTimestamp).toLocaleString()}
                  <br />
                  By: {currentConflict.incomingModifiedBy}
                </div>
                <button
                  onClick={() => handleResolve('incoming')}
                  className="mt-3 w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
                >
                  Use Incoming
                </button>
              </div>
            </div>

            {typeof currentConflict.localValue === 'string' &&
              typeof currentConflict.incomingValue === 'string' && (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">
                    Manual Merge
                  </div>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    defaultValue={`${currentConflict.localValue}\n\n${currentConflict.incomingValue}`}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleResolve('manual', e.target.value);
                      }
                    }}
                    placeholder="Edit the merged value..."
                  />
                </div>
              )}
          </div>

          <div className="flex gap-2 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {currentIndex > 0 && (
              <button
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-md font-medium"
              >
                Previous
              </button>
            )}
            {allResolved ? (
              <button
                onClick={handleFinish}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
              >
                Finish
              </button>
            ) : (
              <button
                disabled
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-md font-medium cursor-not-allowed"
              >
                Resolve all conflicts to continue
              </button>
            )}
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-md font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}