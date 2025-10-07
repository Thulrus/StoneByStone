import React, { useState, useEffect } from 'react';
import type { Grave, Cemetery, Group } from '../types/cemetery';
import { generateUUID } from '../lib/uuid';
import { getCurrentUserOrAnonymous, getCurrentTimestamp } from '../lib/user';
import { getAllGroups, saveOrUpdateGroup } from '../lib/idb';

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
      group_ids: [],
      last_modified: getCurrentTimestamp(),
      modified_by: getCurrentUserOrAnonymous(),
    },
  });

  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3b82f6');

  // Load available groups
  useEffect(() => {
    const loadGroups = async () => {
      const groups = await getAllGroups();
      setAvailableGroups(groups.filter((g) => !g.properties.deleted));
    };
    loadGroups();
  }, []);

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
          group_ids: [],
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

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    const newGroup: Group = {
      uuid: generateUUID(),
      properties: {
        name: newGroupName,
        description: newGroupDescription || undefined,
        color: newGroupColor,
        last_modified: getCurrentTimestamp(),
        modified_by: getCurrentUserOrAnonymous(),
      },
    };

    await saveOrUpdateGroup(newGroup);

    // Add the new group to available groups
    setAvailableGroups([...availableGroups, newGroup]);

    // Add the new group to the current grave's group_ids
    const currentGroupIds = formData.properties?.group_ids || [];
    setFormData({
      ...formData,
      properties: {
        ...formData.properties!,
        group_ids: [...currentGroupIds, newGroup.uuid],
      },
    });

    // Reset form
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupColor('#3b82f6');
    setShowNewGroupForm(false);
  };

  const handleToggleGroup = (groupId: string) => {
    const currentGroupIds = formData.properties?.group_ids || [];
    const isCurrentlyInGroup = currentGroupIds.includes(groupId);

    setFormData({
      ...formData,
      properties: {
        ...formData.properties!,
        group_ids: isCurrentlyInGroup
          ? currentGroupIds.filter((id) => id !== groupId)
          : [...currentGroupIds, groupId],
      },
    });
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

        {/* Groups Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Groups
            </label>
            <button
              type="button"
              onClick={() => setShowNewGroupForm(!showNewGroupForm)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showNewGroupForm ? 'Cancel' : '+ New Group'}
            </button>
          </div>

          {showNewGroupForm && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md space-y-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name (e.g., Smith Family)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
              <input
                type="text"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Color:
                </label>
                <input
                  type="color"
                  value={newGroupColor}
                  onChange={(e) => setNewGroupColor(e.target.value)}
                  className="h-8 w-16 border border-gray-300 dark:border-gray-600 rounded"
                />
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                >
                  Create & Add
                </button>
              </div>
            </div>
          )}

          {availableGroups.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableGroups.map((group) => {
                const isSelected =
                  formData.properties?.group_ids?.includes(group.uuid) || false;
                return (
                  <label
                    key={group.uuid}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleGroup(group.uuid)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: group.properties.color }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {group.properties.name}
                      </div>
                      {group.properties.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {group.properties.description}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No groups yet. Create one above to organize graves.
            </p>
          )}
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
