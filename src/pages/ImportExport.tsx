import { useState } from 'react';
import { importCemeteryFile, exportCemeteryData } from '../lib/file';
import { loadCemetery, replaceAllData, hasData } from '../lib/idb';
import { mergeCemeteryData, applyMergeResult } from '../lib/merge';
import { MergeConflictModal } from '../components/MergeConflictModal';
import type { CemeteryData, MergeConflict, ConflictResolution } from '../types/cemetery';
import { getCurrentTimestamp, getCurrentUser } from '../lib/user';

function ImportExport() {
  const [importStatus, setImportStatus] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [mergeConflicts, setMergeConflicts] = useState<MergeConflict[]>([]);
  const [pendingMerge, setPendingMerge] = useState<{
    local: CemeteryData;
    incoming: CemeteryData;
  } | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Reading file...');

    try {
      const result = await importCemeteryFile(file);

      if (result.errors) {
        setImportStatus('Validation failed');
        alert(`Validation errors:\n\n${result.errors.join('\n')}`);
        setIsImporting(false);
        return;
      }

      if (!result.data) {
        setImportStatus('No data in file');
        setIsImporting(false);
        return;
      }

      // Check if local data exists
      const localExists = await hasData();

      if (!localExists) {
        // No local data - just import
        await replaceAllData(result.data);
        setImportStatus(`Imported ${result.data.graves.length} graves`);
        setIsImporting(false);
        return;
      }

      // Ask user: merge or replace?
      const choice = confirm(
        'Local data exists. Click OK to MERGE with existing data, or Cancel to REPLACE all data.'
      );

      if (!choice) {
        // Replace
        if (confirm('This will delete all local data. Are you sure?')) {
          await replaceAllData(result.data);
          setImportStatus(`Replaced with ${result.data.graves.length} graves`);
        }
        setIsImporting(false);
        return;
      }

      // Merge
      setImportStatus('Merging data...');
      const local = await loadCemetery();
      if (!local) {
        setImportStatus('Failed to load local data');
        setIsImporting(false);
        return;
      }

      const mergeResult = mergeCemeteryData(local, result.data);

      if (mergeResult.conflicts.length > 0) {
        // Show conflict resolution UI
        setMergeConflicts(mergeResult.conflicts);
        setPendingMerge({ local, incoming: result.data });
        setImportStatus(`Merge ready: ${mergeResult.conflicts.length} conflicts to resolve`);
      } else {
        // No conflicts - apply merge
        const merged = applyMergeResult(local, result.data, mergeResult);
        await replaceAllData(merged);
        setImportStatus(
          `Merged successfully: ${mergeResult.added.length} added, ${mergeResult.updated.length} updated`
        );
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleResolveConflicts = async (resolutions: ConflictResolution[]) => {
    if (!pendingMerge) return;

    try {
      setImportStatus('Applying conflict resolutions...');

      // Apply resolutions to merge result
      const mergeResult = mergeCemeteryData(pendingMerge.local, pendingMerge.incoming);
      const merged = applyMergeResult(pendingMerge.local, pendingMerge.incoming, mergeResult);

      // Apply resolved conflicts
      for (const resolution of resolutions) {
        const grave = merged.graves.find((g) => g.uuid === resolution.uuid);
        if (!grave) continue;

        const fieldParts = resolution.field.split('.');
        if (fieldParts[0] === 'properties' && fieldParts.length === 2) {
          (grave.properties as unknown as Record<string, unknown>)[fieldParts[1]] = resolution.resolvedValue;
        } else {
          (grave as unknown as Record<string, unknown>)[resolution.field] = resolution.resolvedValue;
        }
      }

      // Add change log entry for merge
      merged.change_log.push({
        op: 'set',
        uuid: 'merge',
        changes: { resolutions },
        timestamp: getCurrentTimestamp(),
        user: getCurrentUser(),
      });

      await replaceAllData(merged);
      setImportStatus(
        `Merge complete: ${mergeResult.added.length} added, ${mergeResult.updated.length} updated, ${resolutions.length} conflicts resolved`
      );
      setMergeConflicts([]);
      setPendingMerge(null);
    } catch (error) {
      console.error('Conflict resolution error:', error);
      alert(`Failed to apply merge: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCancelMerge = () => {
    setMergeConflicts([]);
    setPendingMerge(null);
    setImportStatus('Merge cancelled');
  };

  const handleExport = async () => {
    try {
      const data = await loadCemetery();
      if (!data) {
        alert('No data to export');
        return;
      }

      exportCemeteryData(data);
      setImportStatus('Exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
            Upload a <code>.cem.json</code> file. The file will be validated
            against the schema. If local data exists, you can choose to merge or
            replace.
          </p>
          <div className="mb-4">
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              {isImporting ? 'Importing...' : 'Choose File'}
              <input
                id="file-upload"
                type="file"
                accept=".json,.cem.json"
                onChange={handleFileSelect}
                disabled={isImporting}
                className="sr-only"
              />
            </label>
          </div>
          {importStatus && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded text-sm text-blue-900 dark:text-blue-100">
              {importStatus}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Export Cemetery Data
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Download all cemetery data as a <code>.cem.json</code> file. The
            exported file includes all graves, cemetery information, and change
            logs.
          </p>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Export to JSON
          </button>
        </div>
      </div>

      {/* Merge Conflict Modal */}
      {mergeConflicts.length > 0 && (
        <MergeConflictModal
          conflicts={mergeConflicts}
          onResolve={handleResolveConflicts}
          onCancel={handleCancelMerge}
        />
      )}
    </div>
  );
}

export default ImportExport;
