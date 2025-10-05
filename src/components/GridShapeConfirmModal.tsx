import type { GridPosition } from '../types/cemetery';

interface GridShapeConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  invalidElements: Array<{
    type: 'grave' | 'landmark' | 'road';
    uuid: string;
    name: string;
    positions: GridPosition[];
  }>;
  addedCellsCount: number;
  removedCellsCount: number;
}

export function GridShapeConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  invalidElements,
  addedCellsCount,
  removedCellsCount,
}: GridShapeConfirmModalProps) {
  if (!isOpen) return null;

  const hasConflicts = invalidElements.length > 0;
  const netChange = addedCellsCount - removedCellsCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Confirm Cemetery Shape Changes
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Summary */}
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Changes Summary:
          </h3>
          <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {addedCellsCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">➕</span>
                <span>
                  {addedCellsCount} cell{addedCellsCount !== 1 ? 's' : ''} will
                  be added
                </span>
              </div>
            )}
            {removedCellsCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-red-600 dark:text-red-400">➖</span>
                <span>
                  {removedCellsCount} cell{removedCellsCount !== 1 ? 's' : ''}{' '}
                  will be removed
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-300 dark:border-gray-600 mt-2">
              <span className="font-semibold">Net change:</span>
              <span
                className={
                  netChange > 0
                    ? 'text-green-600 dark:text-green-400'
                    : netChange < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                }
              >
                {netChange > 0 ? '+' : ''}
                {netChange} cell{Math.abs(netChange) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Conflicts Warning */}
        {hasConflicts && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
              <span>⚠️</span>
              <span>
                {invalidElements.length} Element
                {invalidElements.length !== 1 ? 's' : ''} Outside Valid Area
              </span>
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mb-3">
              The following elements are located in cells that will be removed.
              They will remain in the cemetery but marked as outside the valid
              area.
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {invalidElements.map((element) => (
                <div
                  key={element.uuid}
                  className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-red-300 dark:border-red-700"
                >
                  <div className="font-medium text-red-800 dark:text-red-200">
                    {element.type === 'grave' && '🪦'}
                    {element.type === 'landmark' && '🏛️'}
                    {element.type === 'road' && '🛣️'}{' '}
                    {element.type.charAt(0).toUpperCase() +
                      element.type.slice(1)}
                    : {element.name}
                  </div>
                  <div className="text-red-600 dark:text-red-400 mt-1">
                    Position
                    {element.positions.length > 1 ? 's' : ''}:{' '}
                    {element.positions
                      .slice(0, 3)
                      .map((pos) => `(${pos.row}, ${pos.col})`)
                      .join(', ')}
                    {element.positions.length > 3 &&
                      ` +${element.positions.length - 3} more`}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-red-700 dark:text-red-300 mt-3 font-medium">
              💡 Recommendation: Move or delete these elements before finalizing
              the shape change.
            </p>
          </div>
        )}

        {/* No Conflicts Message */}
        {!hasConflicts && (addedCellsCount > 0 || removedCellsCount > 0) && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
              <span>✓</span>
              <span>
                No conflicts detected. All elements are in valid cells.
              </span>
            </p>
          </div>
        )}

        {/* No Changes Message */}
        {addedCellsCount === 0 && removedCellsCount === 0 && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span>ℹ️</span>
              <span>No changes detected.</span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={addedCellsCount === 0 && removedCellsCount === 0}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              addedCellsCount === 0 && removedCellsCount === 0
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : hasConflicts
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {hasConflicts ? 'Proceed with Conflicts' : 'Confirm Changes'}
          </button>
        </div>

        {/* Help Text */}
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          This action will update the cemetery boundaries and can be reverted by
          editing the shape again.
        </p>
      </div>
    </div>
  );
}
