import type { CemeteryData } from '../types/cemetery';
import { validateCemeteryData, formatValidationErrors } from './validator';

/**
 * File I/O helpers using browser File API
 */

/**
 * Read a file as text
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Read a file as JSON
 */
export async function readFileAsJSON<T = unknown>(file: File): Promise<T> {
  const text = await readFileAsText(file);
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Invalid JSON: ${error}`);
  }
}

/**
 * Import and validate a cemetery data file
 */
export async function importCemeteryFile(
  file: File
): Promise<{ data: CemeteryData; errors: null } | { data: null; errors: string[] }> {
  try {
    const data = await readFileAsJSON<CemeteryData>(file);
    const validation = validateCemeteryData(data);

    if (!validation.valid) {
      const errorMessages = formatValidationErrors(validation.errors);
      return {
        data: null,
        errors: errorMessages,
      };
    }

    return {
      data,
      errors: null,
    };
  } catch (error) {
    return {
      data: null,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Download data as a JSON file
 */
export function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export cemetery data as a .cem.json file
 */
export function exportCemeteryData(data: CemeteryData): void {
  const filename = `${data.cemetery.name || 'cemetery'}.cem.json`;
  downloadJSON(data, filename);
}

/**
 * Trigger file picker and return selected file
 */
export function selectFile(accept?: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) {
      input.accept = accept;
    }

    input.onchange = () => {
      const file = input.files?.[0] || null;
      resolve(file);
    };

    input.oncancel = () => {
      resolve(null);
    };

    input.click();
  });
}
