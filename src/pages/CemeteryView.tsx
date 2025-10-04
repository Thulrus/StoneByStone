import { useState, useEffect } from 'react';
import type { CemeteryData, Grave } from '../types/cemetery';
import { MapGrid } from '../components/MapGrid';
import { GraveList } from '../components/GraveList';
import { GraveEditor } from '../components/GraveEditor';
import { loadCemetery, saveOrUpdateGrave, appendChangeLog } from '../lib/idb';
import { getCurrentUser, getCurrentTimestamp } from '../lib/user';
import { detectSpatialConflicts } from '../lib/merge';

export function CemeteryView() {
  const [cemeteryData, setCemeteryData] = useState<CemeteryData | null>(null);
  const [selectedGrave, setSelectedGrave] = useState<Grave | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [highlightedGraves, setHighlightedGraves] = useState<Set<string>>(
    new Set()
  );
  const [spatialConflicts, setSpatialConflicts] = useState<
    Map<string, Grave[]>
  >(new Map());
  const [showConflicts, setShowConflicts] = useState(false);
  const [showGraveList, setShowGraveList] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // Load cemetery data on mount
  useEffect(() => {
    const loadData = async () => {
      const data = await loadCemetery();
      if (data) {
        setCemeteryData(data);
        checkSpatialConflicts(data.graves);
      }
    };
    loadData();
  }, []);

  const loadData = async () => {
    const data = await loadCemetery();
    if (data) {
      setCemeteryData(data);
      checkSpatialConflicts(data.graves);
    }
  };

  const checkSpatialConflicts = (graves: Grave[]) => {
    const conflicts = detectSpatialConflicts(graves);
    setSpatialConflicts(conflicts);
    if (conflicts.size > 0) {
      console.warn('Spatial conflicts detected:', conflicts);
    }
  };

  const handleSaveGrave = async (grave: Grave) => {
    try {
      await saveOrUpdateGrave(grave);

      // Log the change
      const changeEntry = {
        op: 'set' as const,
        uuid: grave.uuid,
        changes: grave as unknown as Record<string, unknown>,
        timestamp: getCurrentTimestamp(),
        user: getCurrentUser(),
      };
      await appendChangeLog(changeEntry);

      // Reload data
      await loadData();
      setIsEditing(false);
      setIsCreating(false);
      setSelectedGrave(null);
    } catch (error) {
      console.error('Failed to save grave:', error);
      alert('Failed to save grave');
    }
  };

  const handleDeleteGrave = async (uuid: string) => {
    try {
      const grave = cemeteryData?.graves.find((g) => g.uuid === uuid);
      if (!grave) return;

      // Mark as deleted
      const deletedGrave: Grave = {
        ...grave,
        properties: {
          ...grave.properties,
          deleted: true,
          last_modified: getCurrentTimestamp(),
          modified_by: getCurrentUser(),
        },
      };

      await saveOrUpdateGrave(deletedGrave);

      // Log the deletion
      const changeEntry = {
        op: 'delete' as const,
        uuid: grave.uuid,
        changes: { deleted: true },
        timestamp: getCurrentTimestamp(),
        user: getCurrentUser(),
      };
      await appendChangeLog(changeEntry);

      // Reload data
      await loadData();
      setIsEditing(false);
      setSelectedGrave(null);
    } catch (error) {
      console.error('Failed to delete grave:', error);
      alert('Failed to delete grave');
    }
  };

  const handleGraveClick = (grave: Grave) => {
    setSelectedGrave(grave);
    setIsEditing(true);
    setIsCreating(false);
    setShowEditor(true);
    setShowGraveList(false); // Close list when selecting a grave
  };

  const handleNewGrave = () => {
    setSelectedGrave(null);
    setIsCreating(true);
    setIsEditing(false);
    setShowEditor(true);
    setShowGraveList(false); // Close list when creating a new grave
  };

  const handleCancel = () => {
    setSelectedGrave(null);
    setIsEditing(false);
    setIsCreating(false);
    setShowEditor(false);
  };

  if (!cemeteryData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            No Cemetery Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Import a cemetery file to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex relative">
      {/* Mobile Toggle Buttons */}
      <div className="md:hidden absolute top-4 left-4 z-20 flex gap-2">
        <button
          onClick={() => {
            setShowGraveList(!showGraveList);
            // Close editor when opening list
            if (!showGraveList) {
              setShowEditor(false);
            }
          }}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg text-sm font-medium text-gray-700 dark:text-gray-300"
          aria-label="Toggle grave list"
        >
          {showGraveList ? '✕ List' : '☰ List'}
        </button>
        {(isEditing || isCreating) && (
          <button
            onClick={() => {
              setShowEditor(!showEditor);
              // Close list when opening editor
              if (!showEditor) {
                setShowGraveList(false);
              }
            }}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg text-sm font-medium text-gray-700 dark:text-gray-300"
            aria-label="Toggle editor"
          >
            {showEditor ? '✕ Editor' : '✏ Edit'}
          </button>
        )}
      </div>

      {/* Grave List Sidebar */}
      <div
        className={`${
          showGraveList ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 absolute md:relative z-10 w-80 h-full border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {cemeteryData.cemetery.name}
          </h2>
          <button
            onClick={handleNewGrave}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
          >
            + New Grave
          </button>
          {spatialConflicts.size > 0 && (
            <button
              onClick={() => setShowConflicts(!showConflicts)}
              className="w-full mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-sm"
            >
              ⚠ {spatialConflicts.size} Spatial Conflict
              {spatialConflicts.size > 1 ? 's' : ''}
            </button>
          )}
        </div>
        <GraveList
          graves={cemeteryData.graves}
          selectedGrave={selectedGrave}
          onSelectGrave={handleGraveClick}
          onSearch={setHighlightedGraves}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Map Grid */}
        <div className="flex-1">
          <MapGrid
            cemetery={cemeteryData.cemetery}
            graves={cemeteryData.graves}
            selectedGrave={selectedGrave}
            onGraveClick={handleGraveClick}
            highlightedGraves={highlightedGraves}
          />
        </div>

        {/* Editor Panel */}
        {(isEditing || isCreating) && (
          <div
            className={`${
              showEditor ? 'translate-x-0' : 'translate-x-full'
            } md:translate-x-0 absolute md:relative right-0 z-10 w-full md:w-96 h-full border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out`}
          >
            <GraveEditor
              grave={selectedGrave}
              cemetery={cemeteryData.cemetery}
              onSave={handleSaveGrave}
              onDelete={handleDeleteGrave}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>

      {/* Spatial Conflicts Modal */}
      {showConflicts && spatialConflicts.size > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Spatial Conflicts
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The following grid positions have multiple graves:
            </p>
            <div className="space-y-4">
              {Array.from(spatialConflicts.entries()).map(([key, graves]) => (
                <div
                  key={key}
                  className="border border-red-300 dark:border-red-700 rounded-lg p-4"
                >
                  <div className="font-semibold text-red-600 dark:text-red-400 mb-2">
                    Position: {key}
                  </div>
                  <div className="space-y-2">
                    {graves.map((grave) => (
                      <div key={grave.uuid} className="text-sm">
                        • {grave.properties.name || 'Unnamed'} ({grave.plot})
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowConflicts(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-md font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
