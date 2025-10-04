import { useState, useEffect } from 'react';
import type { Landmark, LandmarkType, Cemetery } from '../types/cemetery';
import { getCurrentUser, getCurrentTimestamp } from '../lib/user';

interface LandmarkEditorProps {
  landmark: Landmark | null;
  cemetery: Cemetery;
  onSave: (landmark: Landmark) => void;
  onDelete?: (uuid: string) => void;
  onCancel: () => void;
}

const landmarkTypeOptions: { value: LandmarkType; label: string }[] = [
  { value: 'tree', label: 'Tree (Deciduous)' },
  { value: 'pine', label: 'Pine Tree' },
  { value: 'bench', label: 'Bench' },
  { value: 'statue', label: 'Statue' },
  { value: 'building', label: 'Building' },
  { value: 'other', label: 'Other' },
];

export function LandmarkEditor({
  landmark,
  cemetery,
  onSave,
  onDelete,
  onCancel,
}: LandmarkEditorProps) {
  const [landmarkType, setLandmarkType] = useState<LandmarkType>(
    landmark?.landmark_type || 'tree'
  );
  const [name, setName] = useState(landmark?.properties.name || '');
  const [description, setDescription] = useState(
    landmark?.properties.description || ''
  );
  const [notes, setNotes] = useState(landmark?.properties.notes || '');
  const [row, setRow] = useState(landmark?.grid.row.toString() || '0');
  const [col, setCol] = useState(landmark?.grid.col.toString() || '0');

  useEffect(() => {
    if (landmark) {
      setLandmarkType(landmark.landmark_type);
      setName(landmark.properties.name || '');
      setDescription(landmark.properties.description || '');
      setNotes(landmark.properties.notes || '');
      setRow(landmark.grid.row.toString());
      setCol(landmark.grid.col.toString());
    }
  }, [landmark]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const rowNum = parseInt(row, 10);
    const colNum = parseInt(col, 10);

    if (isNaN(rowNum) || isNaN(colNum)) {
      alert('Row and column must be valid numbers');
      return;
    }

    if (
      rowNum < 0 ||
      rowNum >= cemetery.grid.rows ||
      colNum < 0 ||
      colNum >= cemetery.grid.cols
    ) {
      alert(
        `Grid position must be within cemetery bounds (0-${cemetery.grid.rows - 1}, 0-${cemetery.grid.cols - 1})`
      );
      return;
    }

    const updatedLandmark: Landmark = {
      uuid: landmark?.uuid || crypto.randomUUID(),
      landmark_type: landmarkType,
      grid: { row: rowNum, col: colNum },
      geometry: landmark?.geometry,
      properties: {
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        deleted: landmark?.properties.deleted,
        last_modified: getCurrentTimestamp(),
        modified_by: getCurrentUser(),
      },
    };

    onSave(updatedLandmark);
  };

  const handleDelete = () => {
    if (!landmark) return;

    if (
      window.confirm(
        'Are you sure you want to delete this landmark? This action cannot be undone.'
      )
    ) {
      onDelete?.(landmark.uuid);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {landmark ? 'Edit Landmark' : 'New Landmark'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Landmark Type */}
        <div>
          <label
            htmlFor="landmarkType"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Type *
          </label>
          <select
            id="landmarkType"
            value={landmarkType}
            onChange={(e) => setLandmarkType(e.target.value as LandmarkType)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            required
          >
            {landmarkTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Large Oak Tree, Memorial Bench"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the landmark"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Grid Position */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="row"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Row *
            </label>
            <input
              type="number"
              id="row"
              value={row}
              onChange={(e) => setRow(e.target.value)}
              min="0"
              max={cemetery.grid.rows - 1}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="col"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Column *
            </label>
            <input
              type="number"
              id="col"
              value={col}
              onChange={(e) => setCol(e.target.value)}
              min="0"
              max={cemetery.grid.cols - 1}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes or observations"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-md font-medium"
          >
            Cancel
          </button>
        </div>

        {/* Delete Button */}
        {landmark && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
          >
            Delete Landmark
          </button>
        )}
      </form>
    </div>
  );
}
