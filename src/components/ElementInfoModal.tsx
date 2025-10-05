import type { Grave, Landmark, Road } from '../types/cemetery';

type Element = Grave | Landmark | Road;

interface ElementInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  element: Element | null;
  elementType: 'grave' | 'landmark' | 'road' | null;
  onEdit: () => void;
}

export function ElementInfoModal({
  isOpen,
  onClose,
  element,
  elementType,
  onEdit,
}: ElementInfoModalProps) {
  if (!isOpen || !element || !elementType) return null;

  const renderGraveInfo = (grave: Grave) => (
    <>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Grave Information
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Name
          </label>
          <p className="text-gray-900 dark:text-white">
            {grave.properties.name || (
              <span className="italic text-gray-400">No name recorded</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Birth Date
            </label>
            <p className="text-gray-900 dark:text-white">
              {grave.properties.birth || (
                <span className="text-gray-400">Unknown</span>
              )}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Death Date
            </label>
            <p className="text-gray-900 dark:text-white">
              {grave.properties.death || (
                <span className="text-gray-400">Unknown</span>
              )}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Grid Position
          </label>
          <p className="text-gray-900 dark:text-white">
            Row {grave.grid.row}, Column {grave.grid.col}
          </p>
        </div>

        {grave.properties.inscription && (
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Inscription
            </label>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
              {grave.properties.inscription}
            </p>
          </div>
        )}

        {grave.properties.notes && (
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Notes
            </label>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
              {grave.properties.notes}
            </p>
          </div>
        )}

        {grave.geometry && (
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              GPS Coordinates
            </label>
            <p className="text-gray-900 dark:text-white text-sm">
              {grave.geometry.coordinates[1].toFixed(6)},{' '}
              {grave.geometry.coordinates[0].toFixed(6)}
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-400 dark:text-gray-500">
            Last Modified
          </label>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {new Date(grave.properties.last_modified).toLocaleString()} by{' '}
            {grave.properties.modified_by}
          </p>
        </div>
      </div>
    </>
  );

  const renderLandmarkInfo = (landmark: Landmark) => (
    <>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Landmark Information
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Type
          </label>
          <p className="text-gray-900 dark:text-white capitalize">
            {landmark.landmark_type}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Name
          </label>
          <p className="text-gray-900 dark:text-white">
            {landmark.properties.name || (
              <span className="italic text-gray-400">No name recorded</span>
            )}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Grid Position
          </label>
          <p className="text-gray-900 dark:text-white">
            Row {landmark.grid.row}, Column {landmark.grid.col}
          </p>
        </div>

        {landmark.properties.description && (
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Description
            </label>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
              {landmark.properties.description}
            </p>
          </div>
        )}

        {landmark.properties.notes && (
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Notes
            </label>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
              {landmark.properties.notes}
            </p>
          </div>
        )}

        {landmark.geometry && (
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              GPS Coordinates
            </label>
            <p className="text-gray-900 dark:text-white text-sm">
              {landmark.geometry.coordinates[1].toFixed(6)},{' '}
              {landmark.geometry.coordinates[0].toFixed(6)}
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-400 dark:text-gray-500">
            Last Modified
          </label>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {new Date(landmark.properties.last_modified).toLocaleString()} by{' '}
            {landmark.properties.modified_by}
          </p>
        </div>
      </div>
    </>
  );

  const renderRoadInfo = (road: Road) => (
    <>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Road/Path Information
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Name
          </label>
          <p className="text-gray-900 dark:text-white">
            {road.properties.name || (
              <span className="italic text-gray-400">No name recorded</span>
            )}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Length
          </label>
          <p className="text-gray-900 dark:text-white">
            {road.cells.length} cell{road.cells.length !== 1 ? 's' : ''}
          </p>
        </div>

        {road.properties.color && (
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Color
            </label>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: road.properties.color }}
              />
              <p className="text-gray-900 dark:text-white text-sm">
                {road.properties.color}
              </p>
            </div>
          </div>
        )}

        {road.properties.description && (
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Description
            </label>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
              {road.properties.description}
            </p>
          </div>
        )}

        {road.properties.notes && (
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Notes
            </label>
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
              {road.properties.notes}
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-xs font-medium text-gray-400 dark:text-gray-500">
            Last Modified
          </label>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {new Date(road.properties.last_modified).toLocaleString()} by{' '}
            {road.properties.modified_by}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white bg-opacity-95 dark:bg-gray-800 dark:bg-opacity-95 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {elementType === 'grave' && renderGraveInfo(element as Grave)}
          {elementType === 'landmark' &&
            renderLandmarkInfo(element as Landmark)}
          {elementType === 'road' && renderRoadInfo(element as Road)}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-md font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
