import React, { useState, useEffect } from 'react';
import type { Grave, Cemetery } from '../types/cemetery';
import { generateUUID } from '../lib/uuid';
import { getCurrentUserOrAnonymous, getCurrentTimestamp } from '../lib/user';

interface GraveEditorProps {
  grave: Grave | null;
  cemetery: Cemetery;
  onSave: (grave: Grave) => void;
  onDelete: (uuid: string) => void;
  onCancel: () => void;
}

export function GraveEditor({
  grave,
  cemetery,
  onSave,
  onDelete,
  onCancel,
}: GraveEditorProps) {
  const [formData, setFormData] = useState<Partial<Grave>>({
    uuid: '',
    grid: { row: 0, col: 0 },
    properties: {
      name: '',
      birth: '',
      death: '',
      inscription: '',
      notes: '',
      last_modified: getCurrentTimestamp(),
      modified_by: getCurrentUserOrAnonymous(),
    },
  });

  useEffect(() => {
    if (grave) {
      setFormData(grave);
    } else {
      setFormData({
        uuid: generateUUID(),
        grid: { row: 0, col: 0 },
        properties: {
          name: '',
          birth: '',
          death: '',
          inscription: '',
          notes: '',
          last_modified: getCurrentTimestamp(),
          modified_by: getCurrentUserOrAnonymous(),
        },
      });
    }
  }, [grave]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const grid = formData.grid || { row: 0, col: 0 };

    const graveData: Grave = {
      uuid: formData.uuid || generateUUID(),
      grid,
      properties: {
        ...formData.properties!,
        last_modified: getCurrentTimestamp(),
        modified_by: getCurrentUserOrAnonymous(),
      },
    };

    onSave(graveData);
  };

  const handleDelete = () => {
    if (grave && confirm('Are you sure you want to delete this grave?')) {
      onDelete(grave.uuid);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        {grave ? 'Edit Grave' : 'New Grave'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Grid Row
            </label>
            <input
              type="number"
              min="0"
              max={cemetery.grid.rows - 1}
              value={formData.grid?.row ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  grid: { ...formData.grid!, row: parseInt(e.target.value) },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Grid Column
            </label>
            <input
              type="number"
              min="0"
              max={cemetery.grid.cols - 1}
              value={formData.grid?.col ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  grid: { ...formData.grid!, col: parseInt(e.target.value) },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={formData.properties?.name || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                properties: {
                  ...formData.properties!,
                  name: e.target.value || undefined,
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Full name of the deceased (optional)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Birth Date
            </label>
            <input
              type="date"
              value={formData.properties?.birth || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  properties: {
                    ...formData.properties!,
                    birth: e.target.value || undefined,
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Death Date
            </label>
            <input
              type="date"
              value={formData.properties?.death || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  properties: {
                    ...formData.properties!,
                    death: e.target.value || undefined,
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Inscription
          </label>
          <textarea
            value={formData.properties?.inscription || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                properties: {
                  ...formData.properties!,
                  inscription: e.target.value || undefined,
                },
              })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Inscription text on the tombstone (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={formData.properties?.notes || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                properties: {
                  ...formData.properties!,
                  notes: e.target.value || undefined,
                },
              })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Additional notes or observations (optional)"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
          >
            Save
          </button>
          {grave && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-md font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
