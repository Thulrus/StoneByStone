import { useState } from 'react';
import { getCurrentUser } from '../lib/user';
import type { Cemetery } from '../types/cemetery';

interface CreateCemeteryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCemetery: (cemetery: Cemetery) => void;
  hasExistingData?: boolean;
  existingCemeteryName?: string;
}

export function CreateCemeteryModal({
  isOpen,
  onClose,
  onCreateCemetery,
  hasExistingData = false,
  existingCemeteryName = '',
}: CreateCemeteryModalProps) {
  const [name, setName] = useState('');
  const [rows, setRows] = useState('10');
  const [cols, setCols] = useState('10');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Please enter a name for your cemetery');
      return;
    }

    const rowsNum = parseInt(rows);
    const colsNum = parseInt(cols);

    if (!rowsNum || rowsNum < 1 || rowsNum > 100) {
      setError('Rows must be between 1 and 100');
      return;
    }

    if (!colsNum || colsNum < 1 || colsNum > 100) {
      setError('Columns must be between 1 and 100');
      return;
    }

    // Create the cemetery object
    const cemetery: Cemetery = {
      id: 'current',
      name: name.trim(),
      grid: {
        rows: rowsNum,
        cols: colsNum,
        cellSize: 50, // Default cell size
      },
      last_modified: new Date().toISOString(),
      modified_by: getCurrentUser(),
    };

    onCreateCemetery(cemetery);
  };

  const handleClose = () => {
    setName('');
    setRows('10');
    setCols('10');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Create New Cemetery
          </h2>

          {/* Warning if data exists */}
          {hasExistingData && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Warning: Existing Data Will Be Replaced
              </h3>
              <div className="text-sm text-red-800 dark:text-red-200 space-y-2">
                <p>
                  You currently have cemetery data loaded
                  {existingCemeteryName && (
                    <>
                      {' '}
                      for <strong>{existingCemeteryName}</strong>
                    </>
                  )}
                  .
                </p>
                <p>
                  <strong>
                    Creating a new cemetery will replace all existing data.
                  </strong>
                </p>
                <p>
                  Before continuing, make sure you have saved your current work
                  by clicking "Save as File" on the home page. Otherwise, any
                  unsaved changes will be lost permanently.
                </p>
              </div>
            </div>
          )}

          {/* Explanation Section */}
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              How the Cemetery Grid Works
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              Think of your cemetery as a grid, like a checkerboard. Each square
              in the grid can hold a grave, a landmark (like a bench or tree),
              or be part of a road.
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>
                <strong>Rows</strong> go horizontally (left to right)
              </li>
              <li>
                <strong>Columns</strong> go vertically (top to bottom)
              </li>
              <li>A 10×10 grid gives you 100 squares to work with</li>
              <li>
                Don't worry - you can always import a new file later if you need
                to resize!
              </li>
            </ul>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Cemetery Name */}
              <div>
                <label
                  htmlFor="cemetery-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Cemetery Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="cemetery-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Oak Hill Cemetery"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
              </div>

              {/* Grid Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="grid-rows"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Number of Rows <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="grid-rows"
                    value={rows}
                    onChange={(e) => setRows(e.target.value)}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="grid-cols"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Number of Columns <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="grid-cols"
                    value={cols}
                    onChange={(e) => setCols(e.target.value)}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your grid will have{' '}
                <strong>
                  {parseInt(rows) || 0} × {parseInt(cols) || 0} ={' '}
                  {(parseInt(rows) || 0) * (parseInt(cols) || 0)}
                </strong>{' '}
                total squares.
              </p>

              {error && (
                <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Cemetery
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
