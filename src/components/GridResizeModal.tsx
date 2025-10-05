import { useState, useEffect } from 'react';
import type { Cemetery } from '../types/cemetery';
import type { GridDirection } from '../lib/grid';

interface GridResizeModalProps {
  cemetery: Cemetery;
  onResize: (direction: GridDirection, count: number) => void;
  onCancel: () => void;
  conflicts?: Array<{
    type: 'grave' | 'landmark' | 'road';
    uuid: string;
    name: string;
    position: { row: number; col: number };
  }>;
}

export function GridResizeModal({
  cemetery,
  onResize,
  onCancel,
  conflicts = [],
}: GridResizeModalProps) {
  const [direction, setDirection] = useState<GridDirection>('bottom');
  const [count, setCount] = useState<number>(1);

  // Calculate preview dimensions
  const previewDimensions = () => {
    let newRows = cemetery.grid.rows;
    let newCols = cemetery.grid.cols;

    switch (direction) {
      case 'top':
      case 'bottom':
        newRows += count;
        break;
      case 'left':
      case 'right':
        newCols += count;
        break;
    }

    return { rows: newRows, cols: newCols };
  };

  const preview = previewDimensions();
  const isValid = preview.rows >= 1 && preview.cols >= 1;
  const isRemoving = count < 0;
  const isVertical = direction === 'top' || direction === 'bottom';

  // Count elements that will be affected
  const willShift =
    (direction === 'top' || direction === 'left') && count !== 0;

  // Reset conflicts when parameters change
  useEffect(() => {
    // This effect just triggers a re-render when conflicts prop changes
  }, [conflicts]);

  const handleSubmit = () => {
    if (isValid) {
      onResize(direction, count);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Resize Cemetery Grid
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Current Dimensions */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Current dimensions:
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {cemetery.grid.rows} rows × {cemetery.grid.cols} columns
          </p>
        </div>

        {/* Direction Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Add to side:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'top', label: '⬆️ Top', desc: 'Add rows above' },
              { value: 'bottom', label: '⬇️ Bottom', desc: 'Add rows below' },
              { value: 'left', label: '⬅️ Left', desc: 'Add columns left' },
              { value: 'right', label: '➡️ Right', desc: 'Add columns right' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDirection(option.value as GridDirection)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  direction === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:border-blue-400'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {option.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Count Input */}
        <div className="mb-4">
          <label
            htmlFor="count"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Number of {isVertical ? 'rows' : 'columns'}:
          </label>
          <input
            id="count"
            type="number"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min={
              isVertical ? -(cemetery.grid.rows - 1) : -(cemetery.grid.cols - 1)
            }
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Use negative numbers to remove {isVertical ? 'rows' : 'columns'}
          </p>
        </div>

        {/* Preview */}
        <div
          className={`mb-4 p-3 rounded ${isValid ? 'bg-blue-50 dark:bg-blue-900' : 'bg-red-50 dark:bg-red-900'}`}
        >
          <p className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
            {isValid ? '✓ Preview:' : '✗ Invalid:'}
          </p>
          <p
            className={`text-lg font-semibold ${isValid ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}
          >
            {preview.rows} rows × {preview.cols} columns
          </p>
          {!isValid && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Grid must be at least 1×1
            </p>
          )}
        </div>

        {/* Warnings */}
        {willShift && count > 0 && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ All elements will shift{' '}
              {direction === 'top'
                ? 'down'
                : direction === 'left'
                  ? 'right'
                  : ''}{' '}
              by {count} {isVertical ? 'rows' : 'columns'}
            </p>
          </div>
        )}

        {isRemoving && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
              ⚠️ Warning: Removing space
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Elements outside the new bounds will be flagged as conflicts
            </p>
          </div>
        )}

        {/* Conflicts Display */}
        {conflicts.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded max-h-40 overflow-y-auto">
            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              ⚠️ {conflicts.length} element(s) would be outside the grid:
            </p>
            <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
              {conflicts.map((conflict) => (
                <li key={conflict.uuid}>
                  • {conflict.type}: {conflict.name} at ({conflict.position.row}
                  , {conflict.position.col})
                </li>
              ))}
            </ul>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
              These elements will not be moved. Please move them manually first.
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
            onClick={handleSubmit}
            disabled={!isValid}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              isValid
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {conflicts.length > 0 ? 'Resize (with conflicts)' : 'Resize Grid'}
          </button>
        </div>
      </div>
    </div>
  );
}
