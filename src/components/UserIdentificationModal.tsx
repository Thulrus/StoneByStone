import { useState } from 'react';

interface UserIdentificationModalProps {
  isOpen: boolean;
  onSubmit: (identifier: string) => void;
  onCancel: () => void;
}

export function UserIdentificationModal({
  isOpen,
  onSubmit,
  onCancel,
}: UserIdentificationModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError('Please enter your email or name');
      return;
    }

    onSubmit(trimmedIdentifier);
    setIdentifier('');
    setError('');
  };

  const handleCancel = () => {
    setIdentifier('');
    setError('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Identify Yourself
          </h3>

          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <strong>Why do we ask?</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We track who makes changes so that:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside mt-1 space-y-1">
              <li>Contributors can be credited for their work</li>
              <li>Other users can contact you with questions</li>
              <li>Changes can be reviewed and verified</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email or Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError('');
                }}
                placeholder="e.g., you@example.com or Your Name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {error}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <strong>Tip:</strong> Email is preferred so others can reach you
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-md font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
