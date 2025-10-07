import { useState } from 'react';
import type { Grave, Group } from '../types/cemetery';
import { GraveList } from './GraveList';
import { GroupList } from './GroupList';

type Tab = 'graves' | 'groups';

interface TabbedListProps {
  graves: Grave[];
  groups: Group[];
  selectedGrave: Grave | null;
  selectedGroup: Group | null;
  onSelectGrave: (grave: Grave) => void;
  onSelectGroup: (group: Group) => void;
  onGraveSearch: (results: Set<string>) => void;
  highlightedGraveUuid?: string | null;
  groupMemberCounts: Map<string, number>;
  cemeteryName: string;
  spatialConflictsCount: number;
  onShowConflicts: () => void;
}

export function TabbedList({
  graves,
  groups,
  selectedGrave,
  selectedGroup,
  onSelectGrave,
  onSelectGroup,
  onGraveSearch,
  highlightedGraveUuid,
  groupMemberCounts,
  cemeteryName,
  spatialConflictsCount,
  onShowConflicts,
}: TabbedListProps) {
  const [activeTab, setActiveTab] = useState<Tab>('graves');

  return (
    <div className="flex flex-col h-full">
      {/* Header with Cemetery Name */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {cemeteryName}
        </h2>
        {spatialConflictsCount > 0 && (
          <button
            onClick={onShowConflicts}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-sm"
          >
            ⚠ {spatialConflictsCount} Spatial Conflict
            {spatialConflictsCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('graves')}
          className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
            activeTab === 'graves'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Graves ({graves.filter((g) => !g.properties.deleted).length})
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
            activeTab === 'groups'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Groups ({groups.filter((g) => !g.properties.deleted).length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'graves' ? (
          <GraveList
            graves={graves}
            selectedGrave={selectedGrave}
            onSelectGrave={onSelectGrave}
            onSearch={onGraveSearch}
            highlightedGraveUuid={highlightedGraveUuid}
          />
        ) : (
          <GroupList
            groups={groups}
            selectedGroup={selectedGroup}
            onSelectGroup={onSelectGroup}
            memberCounts={groupMemberCounts}
          />
        )}
      </div>
    </div>
  );
}
