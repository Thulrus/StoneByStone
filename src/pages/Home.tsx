import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { hasData, loadCemetery } from '../lib/idb';
import { exportCemeteryData } from '../lib/file';

function Home() {
  const [dataExists, setDataExists] = useState(false);
  const [cemeteryName, setCemeteryName] = useState('');

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

  return (
    <div className="px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to StoneByStone
        </h2>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
          A cemetery data management application with offline support. Track
          cemetery information, graves, and changes over time.
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
            Features
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Offline-first progressive web app</li>
            <li>Local data persistence with IndexedDB</li>
            <li>Import and export cemetery data as JSON</li>
            <li>Interactive grid-based map view</li>
            <li>Smart merge with conflict resolution</li>
            <li>JSON Schema validation for data integrity</li>
            <li>Complete audit trail with change tracking</li>
            <li>Search and filter graves</li>
          </ul>
        </div>

        <div className="flex gap-4">
          {!dataExists ? (
            <Link
              to="/import"
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Import Data to Get Started
            </Link>
          ) : (
            <>
              <Link
                to="/view"
                className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                View Cemetery
              </Link>
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Export Data
              </button>
            </>
          )}
        </div>

        {!dataExists && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-yellow-900 dark:text-yellow-100 text-sm">
              💡 <strong>Tip:</strong> Try importing the sample file at{' '}
              <code className="bg-yellow-100 dark:bg-yellow-800 px-2 py-0.5 rounded">
                samples/example.cem.json
              </code>{' '}
              to see the app in action.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
