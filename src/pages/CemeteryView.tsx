import { useState, useEffect } from 'react';
import type {
  CemeteryData,
  Grave,
  Landmark,
  Road,
  MarkerType,
  GridPosition,
} from '../types/cemetery';
import { MapGrid } from '../components/MapGrid';
import { GraveList } from '../components/GraveList';
import { GraveEditor } from '../components/GraveEditor';
import { LandmarkEditor } from '../components/LandmarkEditor';
import { RoadEditor } from '../components/RoadEditor';
import { MarkerToolbar } from '../components/MarkerToolbar';
import {
  loadCemetery,
  saveOrUpdateGrave,
  saveOrUpdateLandmark,
  saveOrUpdateRoad,
  appendChangeLog,
} from '../lib/idb';
import { getCurrentUser, getCurrentTimestamp } from '../lib/user';
import { detectSpatialConflicts } from '../lib/merge';

export function CemeteryView() {
  const [cemeteryData, setCemeteryData] = useState<CemeteryData | null>(null);
  const [selectedGrave, setSelectedGrave] = useState<Grave | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(
    null
  );
  const [selectedRoad, setSelectedRoad] = useState<Road | null>(null);
  const [selectedRoadCells, setSelectedRoadCells] = useState<GridPosition[]>(
    []
  ); // Cells selected for current road
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
  const [activeMarkerType, setActiveMarkerType] = useState<MarkerType | null>(
    null
  );

  // Set initial sidebar visibility based on screen size
  useEffect(() => {
    const handleResize = () => {
      // On medium and large screens (>= 640px), show grave list by default
      // But only on initial load, not when user is actively editing
      if (window.innerWidth >= 640 && !isEditing && !isCreating) {
        setShowGraveList(true);
      }
      // On large screens (>= 1024px), also show editor if editing
      if (window.innerWidth >= 1024 && (isEditing || isCreating)) {
        setShowEditor(true);
      }
    };

    // Set initial state only
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // Only run on mount and window resize, not on edit state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle ESC key to cancel add mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeMarkerType) {
        setActiveMarkerType(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMarkerType]);

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

  const handleSaveLandmark = async (landmark: Landmark) => {
    try {
      await saveOrUpdateLandmark(landmark);

      // Log the change
      const changeEntry = {
        op: 'set' as const,
        uuid: landmark.uuid,
        changes: landmark as unknown as Record<string, unknown>,
        timestamp: getCurrentTimestamp(),
        user: getCurrentUser(),
      };
      await appendChangeLog(changeEntry);

      // Reload data
      await loadData();
      setIsEditing(false);
      setIsCreating(false);
      setSelectedLandmark(null);
    } catch (error) {
      console.error('Failed to save landmark:', error);
      alert('Failed to save landmark');
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

  const handleDeleteLandmark = async (uuid: string) => {
    try {
      const landmark = cemeteryData?.landmarks?.find((l) => l.uuid === uuid);
      if (!landmark) return;

      // Mark as deleted
      const deletedLandmark: Landmark = {
        ...landmark,
        properties: {
          ...landmark.properties,
          deleted: true,
          last_modified: getCurrentTimestamp(),
          modified_by: getCurrentUser(),
        },
      };

      await saveOrUpdateLandmark(deletedLandmark);

      // Log the deletion
      const changeEntry = {
        op: 'delete' as const,
        uuid: landmark.uuid,
        changes: { deleted: true },
        timestamp: getCurrentTimestamp(),
        user: getCurrentUser(),
      };
      await appendChangeLog(changeEntry);

      // Reload data
      await loadData();
      setIsEditing(false);
      setSelectedLandmark(null);
    } catch (error) {
      console.error('Failed to delete landmark:', error);
      alert('Failed to delete landmark');
    }
  };

  const handleSaveRoad = async (road: Road) => {
    try {
      await saveOrUpdateRoad(road);

      // Log the change
      const changeEntry = {
        op: 'set' as const,
        uuid: road.uuid,
        changes: road as unknown as Record<string, unknown>,
        timestamp: getCurrentTimestamp(),
        user: getCurrentUser(),
      };
      await appendChangeLog(changeEntry);

      // Reload data
      await loadData();
      setIsEditing(false);
      setIsCreating(false);
      setSelectedRoad(null);
      setSelectedRoadCells([]);
    } catch (error) {
      console.error('Failed to save road:', error);
      alert('Failed to save road');
    }
  };

  const handleDeleteRoad = async (uuid: string) => {
    try {
      const road = cemeteryData?.roads?.find((r) => r.uuid === uuid);
      if (!road) return;

      // Mark as deleted
      const deletedRoad: Road = {
        ...road,
        properties: {
          ...road.properties,
          deleted: true,
          last_modified: getCurrentTimestamp(),
          modified_by: getCurrentUser(),
        },
      };

      await saveOrUpdateRoad(deletedRoad);

      // Log the deletion
      const changeEntry = {
        op: 'delete' as const,
        uuid: road.uuid,
        changes: { deleted: true },
        timestamp: getCurrentTimestamp(),
        user: getCurrentUser(),
      };
      await appendChangeLog(changeEntry);

      // Reload data
      await loadData();
      setIsEditing(false);
      setSelectedRoad(null);
      setSelectedRoadCells([]);
    } catch (error) {
      console.error('Failed to delete road:', error);
      alert('Failed to delete road');
    }
  };

  const handleRoadClick = (road: Road) => {
    setSelectedRoad(road);
    setSelectedRoadCells(road.cells);
    setSelectedGrave(null);
    setSelectedLandmark(null);
    setIsEditing(true);
    setIsCreating(false);
    setShowEditor(true);
    setShowGraveList(false);
    setActiveMarkerType(null);
  };

  const handleEditRoadCells = () => {
    // Re-enter cell selection mode for the current road
    if (selectedRoad) {
      setSelectedRoadCells(selectedRoad.cells); // Preserve existing cells
    }
    setActiveMarkerType('street');
    setIsEditing(false);
    setShowEditor(false);
  };

  const handleGraveClick = (grave: Grave) => {
    setSelectedGrave(grave);
    setSelectedLandmark(null);
    setIsEditing(true);
    setIsCreating(false);
    setShowEditor(true);
    setShowGraveList(false); // Close list when selecting a grave
    setActiveMarkerType(null); // Exit add mode when clicking existing grave
  };

  const handleLandmarkClick = (landmark: Landmark) => {
    setSelectedLandmark(landmark);
    setSelectedGrave(null);
    setIsEditing(true);
    setIsCreating(false);
    setShowEditor(true);
    setShowGraveList(false); // Close list when selecting a landmark
    setActiveMarkerType(null); // Exit add mode when clicking existing landmark
  };

  const handleCellClick = (position: GridPosition) => {
    if (!activeMarkerType || !cemeteryData) return;

    if (activeMarkerType === 'grave') {
      // Create a new grave at the clicked position
      const newGrave: Grave = {
        uuid: crypto.randomUUID(),
        plot: `${position.row}-${position.col}`, // Default plot ID
        grid: position,
        properties: {
          last_modified: getCurrentTimestamp(),
          modified_by: getCurrentUser(),
        },
      };

      // Set as selected and open editor
      setSelectedGrave(newGrave);
      setSelectedLandmark(null);
      setIsCreating(true);
      setIsEditing(false);
      setShowEditor(true);
      setShowGraveList(false);
      setActiveMarkerType(null); // Exit add mode after placing
    } else if (activeMarkerType === 'landmark') {
      // Create a new landmark at the clicked position
      const newLandmark: Landmark = {
        uuid: crypto.randomUUID(),
        landmark_type: 'other', // Default type
        grid: position,
        properties: {
          last_modified: getCurrentTimestamp(),
          modified_by: getCurrentUser(),
        },
      };

      // Set as selected and open editor
      setSelectedLandmark(newLandmark);
      setSelectedGrave(null);
      setIsCreating(true);
      setIsEditing(false);
      setShowEditor(true);
      setShowGraveList(false);
      setActiveMarkerType(null); // Exit add mode after placing
    } else if (activeMarkerType === 'street') {
      // Toggle cell selection for road/path
      const cellIndex = selectedRoadCells.findIndex(
        (cell) => cell.row === position.row && cell.col === position.col
      );

      if (cellIndex >= 0) {
        // Cell already selected - remove it
        setSelectedRoadCells((prev) =>
          prev.filter((_, idx) => idx !== cellIndex)
        );
      } else {
        // Cell not selected - add it
        setSelectedRoadCells((prev) => [...prev, position]);
      }
    }
  };

  const handleFinishRoad = () => {
    // Called when user clicks "Done" button to finalize road placement
    if (selectedRoadCells.length === 0) {
      alert('Please select at least one cell for the road/path');
      return;
    }

    // Check if we're editing an existing road or creating a new one
    if (selectedRoad) {
      // Update existing road with new cells
      const updatedRoad: Road = {
        ...selectedRoad,
        cells: selectedRoadCells,
        properties: {
          ...selectedRoad.properties,
          last_modified: getCurrentTimestamp(),
          modified_by: getCurrentUser(),
        },
      };
      setSelectedRoad(updatedRoad);
      setIsEditing(true); // Switch to editing mode instead of creating
      setIsCreating(false);
    } else {
      // Create new road
      const newRoad: Road = {
        uuid: crypto.randomUUID(),
        cells: selectedRoadCells,
        properties: {
          color: '#9ca3af', // Default gray color
          last_modified: getCurrentTimestamp(),
          modified_by: getCurrentUser(),
        },
      };
      setSelectedRoad(newRoad);
      setSelectedGrave(null);
      setSelectedLandmark(null);
      setIsCreating(true);
      setIsEditing(false);
    }

    setShowEditor(true);
    setShowGraveList(false);
    setActiveMarkerType(null); // Exit add mode
  };

  const handleCancel = () => {
    setSelectedGrave(null);
    setSelectedLandmark(null);
    setSelectedRoad(null);
    setSelectedRoadCells([]);
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
    <div className="h-full w-full flex relative overflow-hidden">
      {/* Small Screen (sm and below): Three buttons - List, Map, Edit */}
      <div className="sm:hidden absolute top-4 left-0 right-0 z-20 flex justify-center gap-2 px-4">
        <button
          onClick={() => {
            setShowGraveList(true);
            setShowEditor(false);
          }}
          className={`px-4 py-2 border rounded-lg shadow-lg text-sm font-medium transition-colors ${
            showGraveList
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
          }`}
          aria-label="Show grave list"
        >
          ☰ List
        </button>
        <button
          onClick={() => {
            setShowGraveList(false);
            setShowEditor(false);
          }}
          className={`px-4 py-2 border rounded-lg shadow-lg text-sm font-medium transition-colors ${
            !showGraveList && !showEditor
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
          }`}
          aria-label="Show map"
        >
          🗺 Map
        </button>
        <button
          onClick={() => {
            setShowGraveList(false);
            setShowEditor(true);
          }}
          disabled={!isEditing && !isCreating}
          className={`px-4 py-2 border rounded-lg shadow-lg text-sm font-medium transition-colors ${
            showEditor
              ? 'bg-blue-600 text-white border-blue-600'
              : isEditing || isCreating
                ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-700 cursor-not-allowed'
          }`}
          aria-label="Show editor"
        >
          ✏ Edit
        </button>
      </div>

      {/* Medium Screen (sm to lg): Toggle buttons on left and right */}
      <div className="hidden sm:flex lg:hidden absolute top-4 left-4 z-20">
        <button
          onClick={() => setShowGraveList(!showGraveList)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg text-sm font-medium text-gray-700 dark:text-gray-300"
          aria-label="Toggle grave list"
        >
          {showGraveList ? '✕' : '☰'} List
        </button>
      </div>
      {(isEditing || isCreating) && (
        <div className="hidden sm:flex lg:hidden absolute top-4 right-4 z-20">
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg text-sm font-medium text-gray-700 dark:text-gray-300"
            aria-label="Toggle editor"
          >
            {showEditor ? '✕' : '✏'} Edit
          </button>
        </div>
      )}

      {/* Grave List Sidebar */}
      <div
        className={`${
          showGraveList ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 absolute lg:relative z-10 w-80 h-full border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {cemeteryData.cemetery.name}
          </h2>
          {spatialConflicts.size > 0 && (
            <button
              onClick={() => setShowConflicts(!showConflicts)}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-sm"
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
      <div className="flex-1 flex relative overflow-hidden">
        {/* Map Grid */}
        <div className="flex-1 relative overflow-hidden">
          <MapGrid
            cemetery={cemeteryData.cemetery}
            graves={cemeteryData.graves}
            landmarks={cemeteryData.landmarks}
            roads={cemeteryData.roads}
            selectedRoadCells={selectedRoadCells}
            selectedGrave={selectedGrave}
            onGraveClick={handleGraveClick}
            onLandmarkClick={handleLandmarkClick}
            onRoadClick={handleRoadClick}
            highlightedGraves={highlightedGraves}
            addMode={activeMarkerType}
            onCellClick={handleCellClick}
          />

          {/* Marker Toolbar */}
          <MarkerToolbar
            activeMarkerType={activeMarkerType}
            onSelectMarkerType={setActiveMarkerType}
            onFinishRoad={handleFinishRoad}
            disabled={!cemeteryData}
          />
        </div>

        {/* Editor Panel */}
        {(isEditing || isCreating) && (
          <div
            className={`${
              showEditor ? 'translate-x-0' : 'translate-x-full'
            } lg:translate-x-0 absolute lg:relative right-0 z-10 w-full sm:w-96 h-full border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-800 transition-transform duration-300 ease-in-out`}
          >
            {selectedGrave && (
              <GraveEditor
                grave={selectedGrave}
                cemetery={cemeteryData.cemetery}
                onSave={handleSaveGrave}
                onDelete={handleDeleteGrave}
                onCancel={handleCancel}
              />
            )}
            {selectedLandmark && (
              <LandmarkEditor
                landmark={selectedLandmark}
                cemetery={cemeteryData.cemetery}
                onSave={handleSaveLandmark}
                onDelete={handleDeleteLandmark}
                onCancel={handleCancel}
              />
            )}
            {selectedRoad && (
              <RoadEditor
                road={selectedRoad}
                cemetery={cemeteryData.cemetery}
                onSave={handleSaveRoad}
                onDelete={handleDeleteRoad}
                onCancel={handleCancel}
                onEditCells={handleEditRoadCells}
              />
            )}
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
