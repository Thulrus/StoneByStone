import { useState, useMemo } from 'react';
import type { Group } from '../types/cemetery';

type SortOption = 'name' | 'member-count';

interface GroupListProps {
  groups: Group[];
  selectedGroup: Group | null;
  onSelectGroup: (group: Group) => void;
  memberCounts: Map<string, number>; // Map of group UUID to member count
}

export function GroupList({
  groups,
  selectedGroup,
  onSelectGroup,
  memberCounts,
}: GroupListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [reverseSort, setReverseSort] = useState(false);

  const sortedAndFilteredGroups = useMemo(() => {
    // First filter
    let result = groups.filter((g) => !g.properties.deleted);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((g) => {
        const name = g.properties.name?.toLowerCase() || '';
        const description = g.properties.description?.toLowerCase() || '';
        return name.includes(term) || description.includes(term);
      });
    }

    // Then sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = (a.properties.name || '').localeCompare(
            b.properties.name || ''
          );
          break;
        case 'member-count': {
          const countA = memberCounts.get(a.uuid) || 0;
          const countB = memberCounts.get(b.uuid) || 0;
          comparison = countA - countB;
          break;
        }
      }

      return reverseSort ? -comparison : comparison;
    });

    return result;
  }, [groups, searchTerm, sortBy, reverseSort, memberCounts]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
        <label className="text-sm text-gray-600 dark:text-gray-400">
          Sort:
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="name">Name</option>
          <option value="member-count">Member Count</option>
        </select>
        <button
          onClick={() => setReverseSort(!reverseSort)}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
          title={reverseSort ? 'Ascending' : 'Descending'}
        >
          {reverseSort ? '↑' : '↓'}
        </button>
      </div>

      {/* Results Count */}
      <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
        {sortedAndFilteredGroups.length} group
        {sortedAndFilteredGroups.length !== 1 ? 's' : ''}
        {searchTerm && ` (filtered from ${groups.length})`}
      </div>

      {/* Group List */}
      <div className="flex-1 overflow-y-auto">
        {sortedAndFilteredGroups.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No groups found' : 'No groups yet'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {sortedAndFilteredGroups.map((group) => {
              const isSelected = selectedGroup?.uuid === group.uuid;
              const memberCount = memberCounts.get(group.uuid) || 0;

              return (
                <button
                  key={group.uuid}
                  onClick={() => onSelectGroup(group)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: group.properties.color }}
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {group.properties.name}
                    </span>
                  </div>
                  {group.properties.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 line-clamp-2">
                      {group.properties.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {memberCount} member{memberCount !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
