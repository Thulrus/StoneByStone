import { useState, useMemo, useEffect } from 'react';
import type { Grave } from '../types/cemetery';

type SortOption =
  | 'first-name'
  | 'last-name'
  | 'birth-date'
  | 'death-date'
  | 'spatial';

interface GraveListProps {
  graves: Grave[];
  selectedGrave: Grave | null;
  onSelectGrave: (grave: Grave) => void;
  onSearch: (results: Set<string>) => void;
  highlightedGraveUuid?: string | null; // Newly highlighted grave from list selection
}

export function GraveList({
  graves,
  selectedGrave,
  onSelectGrave,
  onSearch,
  highlightedGraveUuid,
}: GraveListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('first-name');
  const [reverseSort, setReverseSort] = useState(false);

  // Helper function to extract last name from full name
  const getLastName = (name: string | undefined): string => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : name;
  };

  // Helper function to extract first name from full name
  const getFirstName = (name: string | undefined): string => {
    if (!name) return '';
    return name.trim().split(/\s+/)[0];
  };

  const sortedAndFilteredGraves = useMemo(() => {
    // First filter
    let result = graves.filter((g) => !g.properties.deleted);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((g) => {
        const name = g.properties.name?.toLowerCase() || '';
        const gridStr = `${g.grid.row},${g.grid.col}`;
        return name.includes(term) || gridStr.includes(term);
      });
    }

    // Then sort
    const sorted = [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'first-name': {
          const aFirst = getFirstName(a.properties.name).toLowerCase();
          const bFirst = getFirstName(b.properties.name).toLowerCase();
          if (!aFirst && !bFirst) comparison = 0;
          else if (!aFirst)
            comparison = 1; // Push empty to end
          else if (!bFirst) comparison = -1;
          else comparison = aFirst.localeCompare(bFirst);
          break;
        }
        case 'last-name': {
          const aLast = getLastName(a.properties.name).toLowerCase();
          const bLast = getLastName(b.properties.name).toLowerCase();
          if (!aLast && !bLast) comparison = 0;
          else if (!aLast)
            comparison = 1; // Push empty to end
          else if (!bLast) comparison = -1;
          else comparison = aLast.localeCompare(bLast);
          break;
        }
        case 'birth-date': {
          const aBirth = a.properties.birth || '';
          const bBirth = b.properties.birth || '';
          if (!aBirth && !bBirth) comparison = 0;
          else if (!aBirth)
            comparison = 1; // Push empty to end
          else if (!bBirth) comparison = -1;
          else comparison = aBirth.localeCompare(bBirth);
          break;
        }
        case 'death-date': {
          const aDeath = a.properties.death || '';
          const bDeath = b.properties.death || '';
          if (!aDeath && !bDeath) comparison = 0;
          else if (!aDeath)
            comparison = 1; // Push empty to end
          else if (!bDeath) comparison = -1;
          else comparison = aDeath.localeCompare(bDeath);
          break;
        }
        case 'spatial': {
          // Sort by row (top to bottom), then column (left to right)
          if (a.grid.row !== b.grid.row) {
            comparison = a.grid.row - b.grid.row;
          } else {
            comparison = a.grid.col - b.grid.col;
          }
          break;
        }
        default:
          comparison = 0;
      }

      // Apply reverse if enabled
      return reverseSort ? -comparison : comparison;
    });

    return sorted;
  }, [graves, searchTerm, sortBy, reverseSort]);

  // Update search results in parent component
  useEffect(() => {
    if (!searchTerm) {
      onSearch(new Set());
    } else {
      onSearch(new Set(sortedAndFilteredGraves.map((g) => g.uuid)));
    }
  }, [sortedAndFilteredGraves, searchTerm, onSearch]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search by name or grid..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />

        {/* Sort Dropdown and Reverse Button */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="sort-select"
            className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap"
          >
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="first-name">First Name</option>
            <option value="last-name">Last Name</option>
            <option value="birth-date">Birth Date</option>
            <option value="death-date">Death Date</option>
            <option value="spatial">Location</option>
          </select>
          <button
            onClick={() => setReverseSort(!reverseSort)}
            className={`px-3 py-1 text-sm border rounded-md transition-colors ${
              reverseSort
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
            aria-label="Reverse sort order"
            title={reverseSort ? 'Sort order: reversed' : 'Sort order: normal'}
          >
            {reverseSort ? '↓' : '↑'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sortedAndFilteredGraves.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No graves found' : 'No graves yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedAndFilteredGraves.map((grave) => (
              <div
                key={grave.uuid}
                onClick={() => onSelectGrave(grave)}
                className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedGrave?.uuid === grave.uuid
                    ? 'bg-blue-50 dark:bg-blue-900'
                    : highlightedGraveUuid === grave.uuid
                      ? 'bg-yellow-50 dark:bg-yellow-900'
                      : ''
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {grave.properties.name || (
                    <span className="italic text-gray-400">No name</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Grid: ({grave.grid.row}, {grave.grid.col})
                </div>
                {(grave.properties.birth || grave.properties.death) && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {grave.properties.birth || '?'} –{' '}
                    {grave.properties.death || '?'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
        {sortedAndFilteredGraves.length} grave
        {sortedAndFilteredGraves.length !== 1 ? 's' : ''}
        {searchTerm &&
          ` (filtered from ${graves.filter((g) => !g.properties.deleted).length})`}
      </div>
    </div>
  );
}
