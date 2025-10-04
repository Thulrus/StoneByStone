import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  hasData,
  loadCemetery,
  saveCemeteryMeta,
  clearAllData,
} from '../lib/idb';
import { exportCemeteryData } from '../lib/file';
import { CreateCemeteryModal } from '../components/CreateCemeteryModal';
import type { Cemetery } from '../types/cemetery';

function Home() {
  const [dataExists, setDataExists] = useState(false);
  const [cemeteryName, setCemeteryName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkData = async () => {
      const exists = await hasData();
      setDataExists(exists);

      if (exists) {
        const data = await loadCemetery();
        if (data) {
          setCemeteryName(data.cemetery.name);
        }
      }
    };
    checkData();
  }, []);

  const handleExport = async () => {
    try {
      const data = await loadCemetery();
      if (data) {
        exportCemeteryData(data);
      } else {
        alert('No data to export');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  };

  const handleCreateCemetery = async (cemetery: Cemetery) => {
    try {
      // Clear all existing graves, landmarks, roads, and change logs
      await clearAllData();
      // Save the new cemetery metadata
      await saveCemeteryMeta(cemetery);
      setShowCreateModal(false);
      setDataExists(true);
      setCemeteryName(cemetery.name);
      // Navigate to the cemetery view
      navigate('/view');
    } catch (error) {
      console.error('Failed to create cemetery:', error);
      alert('Failed to create cemetery. Please try again.');
    }
  };

  return (
    <div className="px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to StoneByStone
        </h2>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
          A simple way to document and organize cemetery information. Keep track
          of grave locations, names, dates, and notes—all saved right on your
          device.
        </p>

        {dataExists && (
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
            <p className="text-blue-900 dark:text-blue-100">
              Currently viewing: <strong>{cemeteryName}</strong>
            </p>
            <Link
              to="/view"
              className="inline-block mt-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              Go to Cemetery View →
            </Link>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            What Can You Do?
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Create a map of your cemetery with a simple grid layout</li>
            <li>
              Add grave information including names, dates, and inscriptions
            </li>
            <li>Mark special features like benches, trees, and buildings</li>
            <li>Search for specific graves quickly and easily</li>
            <li>Save your work as a file to share or back up</li>
            <li>
              Load files from others to collaborate on cemetery documentation
            </li>
            <li>Works completely offline—no internet needed</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {!dataExists ? (
            <>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Create New Cemetery
              </button>
              <Link
                to="/import"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Load Existing File
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/view"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                View Cemetery
              </Link>
              <button
                onClick={handleExport}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Save as File
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Create New Cemetery
              </button>
              <Link
                to="/import"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Load Different File
              </Link>
            </>
          )}
        </div>

        {!dataExists && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-yellow-900 dark:text-yellow-100 text-sm">
              💡 <strong>New here?</strong> Start by creating a new cemetery or
              try loading a sample file to see how it works!
            </p>
          </div>
        )}

        <CreateCemeteryModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateCemetery={handleCreateCemetery}
          hasExistingData={dataExists}
          existingCemeteryName={cemeteryName}
        />
      </div>
    </div>
  );
}

export default Home;
