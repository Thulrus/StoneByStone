import { useState } from 'react';

function ImportExport() {
  const [importStatus, setImportStatus] = useState<string>('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: Implement file reading and validation
    setImportStatus(`Selected: ${file.name}`);
    console.log('File selected:', file);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export clicked');
    setImportStatus('Export functionality not yet implemented');
  };

  return (
    <div className="px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Import & Export Data
        </h2>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Import Cemetery Data
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Upload a JSON file containing cemetery data. The file will be
            validated against the schema before import.
          </p>
          <div className="mb-4">
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              Choose File
              <input
                id="file-upload"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="sr-only"
              />
            </label>
          </div>
          {importStatus && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {importStatus}
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Export Cemetery Data
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Download all cemetery data as a JSON file. The exported file will
            include all graves, cemetery information, and change logs.
          </p>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Export to JSON
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportExport;
