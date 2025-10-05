import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  CemeteryData,
  Grave,
  Landmark,
  Road,
  MarkerType,
  GridPosition,
} from '../types/cemetery';
import type { GridDirection } from '../lib/grid';
import { MapGrid } from '../components/MapGrid';
import type { MapGridRef } from '../components/MapGrid';
import { GraveList } from '../components/GraveList';
import { GraveEditor } from '../components/GraveEditor';
import { LandmarkEditor } from '../components/LandmarkEditor';
import { RoadEditor } from '../components/RoadEditor';
import { MapToolbar } from '../components/MapToolbar';
import { CellSelectionModal } from '../components/CellSelectionModal';
import { ElementInfoModal } from '../components/ElementInfoModal';
import { UserIdentificationModal } from '../components/UserIdentificationModal';
import { GridResizeModal } from '../components/GridResizeModal';
import { GridShapeConfirmModal } from '../components/GridShapeConfirmModal';
import {
  loadCemetery,
  saveOrUpdateGrave,
  saveOrUpdateLandmark,
  saveOrUpdateRoad,
  appendChangeLog,
  batchUpdateCemeteryAndElements,
} from '../lib/idb';
import {
  getCurrentUserOrAnonymous,
  getCurrentTimestamp,
  hasUserIdentifier,
  setCurrentUser,
} from '../lib/user';
import { detectSpatialConflicts } from '../lib/merge';
import {
  resizeGrid,
  updateCemeteryShape,
  getAllValidCells,
  isCellValid,
} from '../lib/grid';

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

  // Temporary preview elements for placement feedback
  const [tempGrave, setTempGrave] = useState<Grave | null>(null);
  const [tempLandmark, setTempLandmark] = useState<Landmark | null>(null);

  // State for highlighting a grave from list selection (with floating label)
  const [listHighlightedGrave, setListHighlightedGrave] =
    useState<Grave | null>(null);

  // State for multi-element selection modal
  const [showCellSelection, setShowCellSelection] = useState(false);
  const [selectedCellElements, setSelectedCellElements] = useState<
    Array<{
      type: 'grave' | 'landmark' | 'road';
      data: Grave | Landmark | Road;
    }>
  >([]);
  const [selectedCellPosition, setSelectedCellPosition] =
    useState<GridPosition | null>(null);

  // State for element info modal (view mode before edit)
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoElement, setInfoElement] = useState<
    Grave | Landmark | Road | null
  >(null);
  const [infoElementType, setInfoElementType] = useState<
    'grave' | 'landmark' | 'road' | null
  >(null);

  // State for user identification modal
  const [showUserIdModal, setShowUserIdModal] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<
    (() => Promise<void>) | null
  >(null);

  // State for grid resize modal
  const [showGridResizeModal, setShowGridResizeModal] = useState(false);
  const [gridResizeConflicts, setGridResizeConflicts] = useState<
    Array<{
      type: 'grave' | 'landmark' | 'road';
      uuid: string;
      name: string;
      position: GridPosition;
    }>
  >([]);

  // State for grid shape editing
  const [isGridEditMode, setIsGridEditMode] = useState(false);
  const [pendingValidCells, setPendingValidCells] =
    useState<Set<string> | null>(null);
  const [originalValidCells, setOriginalValidCells] =
    useState<Set<string> | null>(null);
  const [showGridShapeConfirm, setShowGridShapeConfirm] = useState(false);

  // Ref for MapGrid zoom controls
  const mapGridRef = useRef<MapGridRef>(null);

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

  // Helper to execute save action with user identification check
  const withUserIdentification = async (
    saveAction: () => Promise<void>
  ): Promise<void> => {
    if (!hasUserIdentifier()) {
      // Store the action and show user ID modal
      setPendingSaveAction(() => saveAction);
      setShowUserIdModal(true);
    } else {
      // User already identified, execute immediately
      await saveAction();
    }
  };

  // Handle user identification submission
  const handleUserIdentification = async (identifier: string) => {
    setCurrentUser(identifier);
    setShowUserIdModal(false);

    // Execute the pending save action
    if (pendingSaveAction) {
      await pendingSaveAction();
      setPendingSaveAction(null);
    }
  };

  // Handle user identification cancellation
  const handleUserIdCancel = () => {
    setShowUserIdModal(false);
    setPendingSaveAction(null);
  };

  const handleSaveGrave = async (grave: Grave) => {
    await withUserIdentification(async () => {
      try {
        await saveOrUpdateGrave(grave);

        // Log the change
        const changeEntry = {
          op: 'set' as const,
          uuid: grave.uuid,
          changes: grave as unknown as Record<string, unknown>,
          timestamp: getCurrentTimestamp(),
          user: getCurrentUserOrAnonymous(),
        };
        await appendChangeLog(changeEntry);

        // Reload data
        await loadData();
        setIsEditing(false);
        setIsCreating(false);
        setSelectedGrave(null);
        // Clear temporary preview
        setTempGrave(null);
      } catch (error) {
        console.error('Failed to save grave:', error);
        alert('Failed to save grave');
      }
    });
  };

  const handleSaveLandmark = async (landmark: Landmark) => {
    await withUserIdentification(async () => {
      try {
        await saveOrUpdateLandmark(landmark);

        // Log the change
        const changeEntry = {
          op: 'set' as const,
          uuid: landmark.uuid,
          changes: landmark as unknown as Record<string, unknown>,
          timestamp: getCurrentTimestamp(),
          user: getCurrentUserOrAnonymous(),
        };
        await appendChangeLog(changeEntry);

        // Reload data
        await loadData();
        setIsEditing(false);
        setIsCreating(false);
        setSelectedLandmark(null);
        // Clear temporary preview
        setTempLandmark(null);
      } catch (error) {
        console.error('Failed to save landmark:', error);
        alert('Failed to save landmark');
      }
    });
  };

  const handleDeleteGrave = async (uuid: string) => {
    await withUserIdentification(async () => {
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
            modified_by: getCurrentUserOrAnonymous(),
          },
        };

        await saveOrUpdateGrave(deletedGrave);

        // Log the deletion
        const changeEntry = {
          op: 'delete' as const,
          uuid: grave.uuid,
          changes: { deleted: true },
          timestamp: getCurrentTimestamp(),
          user: getCurrentUserOrAnonymous(),
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
    });
  };

  const handleDeleteLandmark = async (uuid: string) => {
    await withUserIdentification(async () => {
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
            modified_by: getCurrentUserOrAnonymous(),
          },
        };

        await saveOrUpdateLandmark(deletedLandmark);

        // Log the deletion
        const changeEntry = {
          op: 'delete' as const,
          uuid: landmark.uuid,
          changes: { deleted: true },
          timestamp: getCurrentTimestamp(),
          user: getCurrentUserOrAnonymous(),
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
    });
  };

  const handleSaveRoad = async (road: Road) => {
    await withUserIdentification(async () => {
      try {
        await saveOrUpdateRoad(road);

        // Log the change
        const changeEntry = {
          op: 'set' as const,
          uuid: road.uuid,
          changes: road as unknown as Record<string, unknown>,
          timestamp: getCurrentTimestamp(),
          user: getCurrentUserOrAnonymous(),
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
    });
  };

  const handleDeleteRoad = async (uuid: string) => {
    await withUserIdentification(async () => {
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
            modified_by: getCurrentUserOrAnonymous(),
          },
        };

        await saveOrUpdateRoad(deletedRoad);

        // Log the deletion
        const changeEntry = {
          op: 'delete' as const,
          uuid: road.uuid,
          changes: { deleted: true },
          timestamp: getCurrentTimestamp(),
          user: getCurrentUserOrAnonymous(),
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
    });
  };

  // Grid resize functionality
  const handleOpenGridResize = () => {
    setShowGridResizeModal(true);
    setGridResizeConflicts([]);
  };

  const handleGridResize = async (direction: GridDirection, count: number) => {
    if (!cemeteryData) return;

    await withUserIdentification(async () => {
      try {
        // Perform the resize operation
        const result = resizeGrid({
          cemetery: cemeteryData.cemetery,
          graves: cemeteryData.graves,
          landmarks: cemeteryData.landmarks || [],
          roads: cemeteryData.roads || [],
          direction,
          count,
          userId: getCurrentUserOrAnonymous(),
        });

        // If there are conflicts, show them and don't proceed
        if (result.conflicts.length > 0) {
          setGridResizeConflicts(result.conflicts);
          return; // Don't close modal, let user see conflicts
        }

        // Save all changes in a single transaction
        await batchUpdateCemeteryAndElements(
          result.cemetery,
          result.graves,
          result.landmarks,
          result.roads
        );

        // Log the grid resize operation
        const changeEntry = {
          op: 'set' as const,
          uuid: result.cemetery.id,
          changes: {
            operation: 'grid_resize',
            direction,
            count,
            oldDimensions: {
              rows: cemeteryData.cemetery.grid.rows,
              cols: cemeteryData.cemetery.grid.cols,
            },
            newDimensions: {
              rows: result.cemetery.grid.rows,
              cols: result.cemetery.grid.cols,
            },
          },
          timestamp: getCurrentTimestamp(),
          user: getCurrentUserOrAnonymous(),
        };
        await appendChangeLog(changeEntry);

        // Reload data to show updated cemetery
        await loadData();
        setShowGridResizeModal(false);
        setGridResizeConflicts([]);
      } catch (error) {
        console.error('Failed to resize grid:', error);
        alert(
          'Failed to resize grid: ' +
            (error instanceof Error ? error.message : 'Unknown error')
        );
      }
    });
  };

  const handleCancelGridResize = () => {
    setShowGridResizeModal(false);
    setGridResizeConflicts([]);
  };

  // Grid shape editing handlers
  const handleToggleGridEdit = () => {
    if (!cemeteryData) return;

    if (isGridEditMode) {
      // Exiting grid edit mode - reset everything
      setIsGridEditMode(false);
      setPendingValidCells(null);
      setOriginalValidCells(null);
    } else {
      // Entering grid edit mode - initialize
      const currentValidCells =
        cemeteryData.cemetery.grid.validCells ||
        getAllValidCells(cemeteryData.cemetery);
      setOriginalValidCells(new Set(currentValidCells));
      setPendingValidCells(new Set(currentValidCells));
      setIsGridEditMode(true);
    }
  };

  const handleCellPaint = useCallback((position: GridPosition) => {
    const cellKey = `${position.row},${position.col}`;

    // Use functional update for better performance
    setPendingValidCells((prevCells) => {
      if (!prevCells) return prevCells;

      const newPendingCells = new Set(prevCells);

      // Toggle the cell
      if (newPendingCells.has(cellKey)) {
        newPendingCells.delete(cellKey);
      } else {
        newPendingCells.add(cellKey);
      }

      return newPendingCells;
    });
  }, []); // Empty dependency array since we use functional update

  const handleResetGridShape = () => {
    if (originalValidCells) {
      setPendingValidCells(new Set(originalValidCells));
    }
  };

  const handleFinalizeGridShape = () => {
    if (!pendingValidCells || !originalValidCells) return;

    // Show confirmation modal
    setShowGridShapeConfirm(true);
  };

  const handleConfirmGridShape = async () => {
    if (!cemeteryData || !pendingValidCells) return;

    await withUserIdentification(async () => {
      try {
        // Calculate changes
        const result = updateCemeteryShape(
          cemeteryData.cemetery,
          cemeteryData.graves,
          cemeteryData.landmarks || [],
          cemeteryData.roads || [],
          pendingValidCells
        );

        // Save the updated cemetery
        await batchUpdateCemeteryAndElements(
          result.cemetery,
          cemeteryData.graves,
          cemeteryData.landmarks || [],
          cemeteryData.roads || []
        );

        // Log the shape change
        const changeEntry = {
          op: 'set' as const,
          uuid: result.cemetery.id,
          changes: {
            operation: 'grid_shape_edit',
            validCells: Array.from(pendingValidCells),
            invalidElements: result.invalidElements.length,
          },
          timestamp: getCurrentTimestamp(),
          user: getCurrentUserOrAnonymous(),
        };
        await appendChangeLog(changeEntry);

        // Reload data
        await loadData();

        // Close modals and reset state
        setShowGridShapeConfirm(false);
        setIsGridEditMode(false);
        setPendingValidCells(null);
        setOriginalValidCells(null);
      } catch (error) {
        console.error('Failed to update grid shape:', error);
        alert(
          'Failed to update grid shape: ' +
            (error instanceof Error ? error.message : 'Unknown error')
        );
      }
    });
  };

  const handleCancelGridShapeConfirm = () => {
    setShowGridShapeConfirm(false);
  };

  const handleCancelGridEdit = () => {
    setIsGridEditMode(false);
    setPendingValidCells(null);
    setOriginalValidCells(null);
  };

  // Zoom control handlers
  const handleZoomIn = () => {
    mapGridRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapGridRef.current?.zoomOut();
  };

  const handleResetZoom = () => {
    mapGridRef.current?.resetView();
  };

  const handleRoadClick = (road: Road) => {
    // Show info modal instead of jumping to edit
    setInfoElement(road);
    setInfoElementType('road');
    setShowInfoModal(true);
  };

  // Handle clicking "Edit" in the info modal
  const handleEditFromInfo = () => {
    setShowInfoModal(false);

    if (infoElementType === 'grave') {
      setSelectedGrave(infoElement as Grave);
      setSelectedLandmark(null);
      setSelectedRoad(null);
      setIsEditing(true);
      setIsCreating(false);
      setShowEditor(true);
      setShowGraveList(false);
      setActiveMarkerType(null);
    } else if (infoElementType === 'landmark') {
      setSelectedLandmark(infoElement as Landmark);
      setSelectedGrave(null);
      setSelectedRoad(null);
      setIsEditing(true);
      setIsCreating(false);
      setShowEditor(true);
      setShowGraveList(false);
      setActiveMarkerType(null);
    } else if (infoElementType === 'road') {
      const road = infoElement as Road;
      setSelectedRoad(road);
      setSelectedRoadCells(road.cells);
      setSelectedGrave(null);
      setSelectedLandmark(null);
      setIsEditing(true);
      setIsCreating(false);
      setShowEditor(true);
      setShowGraveList(false);
      setActiveMarkerType(null);
    }
  };

  // Handle closing the info modal
  const handleCloseInfo = () => {
    setShowInfoModal(false);
    setInfoElement(null);
    setInfoElementType(null);
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
    // Show info modal instead of jumping to edit (for map clicks)
    setInfoElement(grave);
    setInfoElementType('grave');
    setShowInfoModal(true);
  };

  const handleGraveListSelection = (grave: Grave) => {
    // When selecting from list, highlight on map instead of opening info
    setListHighlightedGrave(grave);

    // Clear the highlight after 3 seconds
    setTimeout(() => {
      setListHighlightedGrave(null);
    }, 3000);
  };

  const handleLandmarkClick = (landmark: Landmark) => {
    // Show info modal instead of jumping to edit
    setInfoElement(landmark);
    setInfoElementType('landmark');
    setShowInfoModal(true);
  };

  const handleMultipleElementsClick = (
    elements: Array<{
      type: 'grave' | 'landmark' | 'road';
      data: Grave | Landmark | Road;
    }>,
    position: GridPosition
  ) => {
    setSelectedCellElements(elements);
    setSelectedCellPosition(position);
    setShowCellSelection(true);
  };

  const handleElementSelection = (
    element: {
      type: 'grave' | 'landmark' | 'road';
      data: Grave | Landmark | Road;
    } | null
  ) => {
    setShowCellSelection(false);
    if (!element) return; // User cancelled

    // Route to the appropriate handler
    switch (element.type) {
      case 'grave':
        handleGraveClick(element.data as Grave);
        break;
      case 'landmark':
        handleLandmarkClick(element.data as Landmark);
        break;
      case 'road':
        handleRoadClick(element.data as Road);
        break;
    }
  };

  const handleCellClick = (position: GridPosition) => {
    if (!activeMarkerType || !cemeteryData) return;

    // Check if the cell is valid (part of the cemetery)
    if (!isCellValid(cemeteryData.cemetery, position)) {
      // Optionally show a message to the user
      console.warn('Cannot place element on invalid cell:', position);
      return;
    }

    if (activeMarkerType === 'grave') {
      // Create a new grave at the clicked position
      const newGrave: Grave = {
        uuid: crypto.randomUUID(),
        grid: position,
        properties: {
          last_modified: getCurrentTimestamp(),
          modified_by: getCurrentUserOrAnonymous(),
        },
      };

      // Set temporary preview
      setTempGrave(newGrave);

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
          modified_by: getCurrentUserOrAnonymous(),
        },
      };

      // Set temporary preview
      setTempLandmark(newLandmark);

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
          modified_by: getCurrentUserOrAnonymous(),
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
          modified_by: getCurrentUserOrAnonymous(),
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
    // Clear temporary preview elements
    setTempGrave(null);
    setTempLandmark(null);
  };

  // Handle marker type selection with sidebar management
  const handleMarkerTypeSelect = (type: MarkerType | null) => {
    setActiveMarkerType(type);

    // Close sidebars on medium and small screens when entering placement mode
    if (type !== null && window.innerWidth < 1024) {
      setShowGraveList(false);
      setShowEditor(false);
    }
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
          onSelectGrave={handleGraveListSelection}
          onSearch={setHighlightedGraves}
          highlightedGraveUuid={listHighlightedGrave?.uuid || null}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Map Grid */}
        <div className="flex-1 relative overflow-hidden">
          <MapGrid
            ref={mapGridRef}
            cemetery={cemeteryData.cemetery}
            graves={cemeteryData.graves}
            landmarks={cemeteryData.landmarks}
            roads={cemeteryData.roads}
            selectedRoadCells={selectedRoadCells}
            selectedGrave={selectedGrave}
            tempGrave={tempGrave}
            tempLandmark={tempLandmark}
            listHighlightedGrave={listHighlightedGrave}
            onGraveClick={handleGraveClick}
            onLandmarkClick={handleLandmarkClick}
            onRoadClick={handleRoadClick}
            onMultipleElementsClick={handleMultipleElementsClick}
            highlightedGraves={highlightedGraves}
            addMode={activeMarkerType}
            onCellClick={handleCellClick}
            gridEditMode={isGridEditMode}
            pendingValidCells={pendingValidCells || undefined}
            onCellPaint={handleCellPaint}
          />

          {/* Unified Map Toolbar */}
          <MapToolbar
            // Marker controls
            activeMarkerType={activeMarkerType}
            onSelectMarkerType={handleMarkerTypeSelect}
            onFinishRoad={handleFinishRoad}
            // Grid edit controls
            isGridEditMode={isGridEditMode}
            onToggleGridEdit={handleToggleGridEdit}
            onResetGridShape={handleResetGridShape}
            onFinalizeGridShape={handleFinalizeGridShape}
            onCancelGridEdit={handleCancelGridEdit}
            hasGridChanges={
              !!(
                pendingValidCells &&
                originalValidCells &&
                (pendingValidCells.size !== originalValidCells.size ||
                  Array.from(pendingValidCells).some(
                    (cell) => !originalValidCells.has(cell)
                  ))
              )
            }
            // Grid resize control
            onOpenGridResize={handleOpenGridResize}
            // Zoom controls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            // Disabled state
            disabled={!cemeteryData || isEditing || isCreating}
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
                        • {grave.properties.name || 'Unnamed'} at (
                        {grave.grid.row}, {grave.grid.col})
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

      {/* Cell Selection Modal - when multiple elements exist at same position */}
      {selectedCellPosition && (
        <CellSelectionModal
          isOpen={showCellSelection}
          onClose={() => setShowCellSelection(false)}
          elements={selectedCellElements}
          position={selectedCellPosition}
          onSelectElement={handleElementSelection}
        />
      )}

      {/* Element Info Modal - read-only view before editing */}
      <ElementInfoModal
        isOpen={showInfoModal}
        onClose={handleCloseInfo}
        element={infoElement}
        elementType={infoElementType}
        onEdit={handleEditFromInfo}
      />

      {/* User Identification Modal - ask for user info when saving */}
      <UserIdentificationModal
        isOpen={showUserIdModal}
        onSubmit={handleUserIdentification}
        onCancel={handleUserIdCancel}
      />

      {/* Grid Resize Modal */}
      {showGridResizeModal && cemeteryData && (
        <GridResizeModal
          cemetery={cemeteryData.cemetery}
          onResize={handleGridResize}
          onCancel={handleCancelGridResize}
          conflicts={gridResizeConflicts}
        />
      )}

      {/* Grid Shape Confirmation Modal */}
      {showGridShapeConfirm &&
        cemeteryData &&
        pendingValidCells &&
        originalValidCells && (
          <GridShapeConfirmModal
            isOpen={showGridShapeConfirm}
            onConfirm={handleConfirmGridShape}
            onCancel={handleCancelGridShapeConfirm}
            invalidElements={
              updateCemeteryShape(
                cemeteryData.cemetery,
                cemeteryData.graves,
                cemeteryData.landmarks || [],
                cemeteryData.roads || [],
                pendingValidCells
              ).invalidElements
            }
            addedCellsCount={
              Array.from(pendingValidCells).filter(
                (cell) => !originalValidCells.has(cell)
              ).length
            }
            removedCellsCount={
              Array.from(originalValidCells).filter(
                (cell) => !pendingValidCells.has(cell)
              ).length
            }
          />
        )}
    </div>
  );
}
