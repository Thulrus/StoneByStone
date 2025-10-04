import { useState, useMemo } from 'react';
import type { Grave } from '../types/cemetery';

interface GraveListProps {
  graves: Grave[];
  selectedGrave: Grave | null;
  onSelectGrave: (grave: Grave) => void;
  onSearch: (results: Set<string>) => void;
}

export function GraveList({
  graves,
  selectedGrave,
  onSelectGrave,
  onSearch,
}: GraveListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGraves = useMemo(() => {
    if (!searchTerm) {
      onSearch(new Set());
      return graves.filter((g) => !g.properties.deleted);
    }

    const term = searchTerm.toLowerCase();
    const results = graves.filter((g) => {
      if (g.properties.deleted) return false;

      const name = g.properties.name?.toLowerCase() || '';
      const plot = g.plot.toLowerCase();
      const gridStr = `${g.grid.row},${g.grid.col}`;

      return name.includes(term) || plot.includes(term) || gridStr.includes(term);
    });

    onSearch(new Set(results.map((g) => g.uuid)));
    return results;
  }, [graves, searchTerm, onSearch]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="Search by name, plot, or grid..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredGraves.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No graves found' : 'No graves yet'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredGraves.map((grave) => (
              <div
                key={grave.uuid}
                onClick={() => onSelectGrave(grave)}
                className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedGrave?.uuid === grave.uuid
                    ? 'bg-blue-50 dark:bg-blue-900'
                    : ''
                }`}
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {grave.properties.name || <span className="italic text-gray-400">No name</span>}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Plot: {grave.plot}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Grid: ({grave.grid.row}, {grave.grid.col})
                </div>
                {(grave.properties.birth || grave.properties.death) && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {grave.properties.birth || '?'} – {grave.properties.death || '?'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
        {filteredGraves.length} grave{filteredGraves.length !== 1 ? 's' : ''}
        {searchTerm && ` (filtered from ${graves.filter((g) => !g.properties.deleted).length})`}
      </div>
    </div>
  );
}