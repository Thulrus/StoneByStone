import React, { useState, useEffect } from 'react';
import type { Road, Cemetery } from '../types/cemetery';
import { getCurrentUserOrAnonymous, getCurrentTimestamp } from '../lib/user';

interface RoadEditorProps {
  road: Road | null;
  cemetery: Cemetery;
  onSave: (road: Road) => void;
  onDelete?: (uuid: string) => void;
  onCancel: () => void;
  onEditCells?: () => void; // Callback to enter cell edit mode
}

// Predefined color options for roads
const roadColorOptions = [
  { value: '#9ca3af', label: 'Gray', preview: '#9ca3af' },
  { value: '#ef4444', label: 'Red', preview: '#ef4444' },
  { value: '#f97316', label: 'Orange', preview: '#f97316' },
  { value: '#eab308', label: 'Yellow', preview: '#eab308' },
  { value: '#22c55e', label: 'Green', preview: '#22c55e' },
  { value: '#3b82f6', label: 'Blue', preview: '#3b82f6' },
  { value: '#8b5cf6', label: 'Purple', preview: '#8b5cf6' },
  { value: '#ec4899', label: 'Pink', preview: '#ec4899' },
  { value: '#6366f1', label: 'Indigo', preview: '#6366f1' },
  { value: '#14b8a6', label: 'Teal', preview: '#14b8a6' },
];

export function RoadEditor({
  road,
  cemetery: _cemetery,
  onSave,
  onDelete,
  onCancel,
  onEditCells,
}: RoadEditorProps) {
  const [name, setName] = useState(road?.properties.name || '');
  const [description, setDescription] = useState(
    road?.properties.description || ''
  );
  const [notes, setNotes] = useState(road?.properties.notes || '');
  const [color, setColor] = useState(
    road?.properties.color || roadColorOptions[0].value
  );

  useEffect(() => {
    if (road) {
      setName(road.properties.name || '');
      setDescription(road.properties.description || '');
      setNotes(road.properties.notes || '');
      setColor(road.properties.color || roadColorOptions[0].value);
    }
  }, [road]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!road || road.cells.length === 0) {
      alert('Road must have at least one cell');
      return;
    }

    const updatedRoad: Road = {
      uuid: road.uuid,
      cells: road.cells,
      properties: {
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        color: color,
        deleted: road.properties.deleted,
        last_modified: getCurrentTimestamp(),
        modified_by: getCurrentUserOrAnonymous(),
      },
    };

    onSave(updatedRoad);
  };

  const handleDelete = () => {
    if (!road) return;

    if (
      window.confirm(
        'Are you sure you want to delete this road/path? This action cannot be undone.'
      )
    ) {
      onDelete?.(road.uuid);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {road ? 'Edit Road/Path' : 'New Road/Path'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cell Count Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>{road?.cells.length || 0}</strong> cells selected
          </p>
        </div>

        {/* Edit Cells Button */}
        {onEditCells && (
          <button
            type="button"
            onClick={onEditCells}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add/Remove Cells
          </button>
        )}

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Overlay Color
          </label>
          <div className="grid grid-cols-5 gap-2">
            {roadColorOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setColor(option.value)}
                className={`relative h-10 rounded-md border-2 transition-all ${
                  color === option.value
                    ? 'border-gray-900 dark:border-white ring-2 ring-blue-500'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                style={{ backgroundColor: option.preview }}
                title={option.label}
                aria-label={`Select ${option.label} color`}
              >
                {color === option.value && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xl font-bold drop-shadow-lg">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Main Path, East Road"
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
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Brief description of the road/path"
          />
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
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes or observations"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>

        {/* Delete Button */}
        {road && !road.properties.deleted && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 mt-4"
          >
            Delete Road/Path
          </button>
        )}
      </form>
    </div>
  );
}
