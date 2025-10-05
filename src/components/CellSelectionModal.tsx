import type { Grave, Landmark, Road } from '../types/cemetery';

interface CellElement {
  type: 'grave' | 'landmark' | 'road';
  data: Grave | Landmark | Road;
}

interface CellSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: CellElement[];
  position: { row: number; col: number };
  onSelectElement: (element: CellElement) => void;
}

export function CellSelectionModal({
  isOpen,
  onClose,
  elements,
  position,
  onSelectElement,
}: CellSelectionModalProps) {
  if (!isOpen || elements.length === 0) return null;

  const getElementLabel = (element: CellElement): string => {
    switch (element.type) {
      case 'grave': {
        const grave = element.data as Grave;
        return (
          grave.properties.name ||
          `Grave at (${grave.grid.row}, ${grave.grid.col})`
        );
      }
      case 'landmark': {
        const landmark = element.data as Landmark;
        return (
          landmark.properties.name ||
          `${landmark.landmark_type} landmark` ||
          'Unnamed Landmark'
        );
      }
      case 'road': {
        const road = element.data as Road;
        return road.properties.name || 'Road/Path';
      }
    }
  };

  const getElementIcon = (element: CellElement): string => {
    switch (element.type) {
      case 'grave':
        return '🪦';
      case 'landmark': {
        const landmark = element.data as Landmark;
        const iconMap: Record<string, string> = {
          bench: '🪑',
          tree: '🌳',
          pine: '🌲',
          building: '🏛️',
          statue: '🗿',
          other: '📍',
        };
        return iconMap[landmark.landmark_type] || '📍';
      }
      case 'road':
        return '🛣️';
    }
  };

  const getElementSubtext = (element: CellElement): string => {
    switch (element.type) {
      case 'grave': {
        const grave = element.data as Grave;
        const birth = grave.properties.birth;
        const death = grave.properties.death;
        if (birth && death) {
          return `${birth} - ${death}`;
        } else if (death) {
          return `d. ${death}`;
        }
        return 'Grave';
      }
      case 'landmark': {
        const landmark = element.data as Landmark;
        return (
          landmark.properties.description ||
          `${landmark.landmark_type} landmark`
        );
      }
      case 'road': {
        const road = element.data as Road;
        return road.properties.description || 'Road/Path';
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Multiple Elements at Cell ({position.row}, {position.col})
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Select which element you want to view or edit:
          </p>
        </div>

        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {elements.map((element, index) => (
            <button
              key={index}
              onClick={() => {
                onSelectElement(element);
                onClose();
              }}
              className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {getElementIcon(element)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {getElementLabel(element)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {getElementSubtext(element)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 capitalize">
                    {element.type}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
