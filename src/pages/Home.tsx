import { Link } from 'react-router-dom';

function Home() {
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Features
          </h3>
          <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Offline-first progressive web app</li>
            <li>Local data persistence with IndexedDB</li>
            <li>Import and export cemetery data as JSON</li>
            <li>JSON Schema validation for data integrity</li>
            <li>Change tracking and audit log</li>
          </ul>
        </div>

        <div className="flex gap-4">
          <Link
            to="/import"
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Import Data
          </Link>
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => {
              // TODO: Implement export functionality
              console.log('Export clicked');
            }}
          >
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
