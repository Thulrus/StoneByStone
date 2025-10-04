import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../schema/cemetery.schema.json';
import type { CemeteryData } from '../types/cemetery';

let validator: ValidateFunction<CemeteryData> | null = null;

/**
 * Initialize the AJV validator
 */
function getValidator(): ValidateFunction<CemeteryData> {
  if (!validator) {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    validator = ajv.compile<CemeteryData>(schema);
  }
  return validator;
}

/**
 * Validate cemetery data against the JSON schema
 */
export function validateCemeteryData(
  data: unknown
): { valid: boolean; errors: ErrorObject[] | null } {
  const validate = getValidator();
  const valid = validate(data);

  return {
    valid,
    errors: validate.errors || null,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ErrorObject[] | null): string[] {
  if (!errors) return [];

  return errors.map((err) => {
    const path = err.instancePath || 'root';
    const message = err.message || 'Unknown error';
    const keyword = err.keyword;
    
    // Provide more helpful messages for common errors
    if (keyword === 'format' && err.params?.format === 'date') {
      return `${path}: Invalid date format. Use YYYY-MM-DD (e.g., 2024-01-15) or leave empty`;
    }
    
    if (keyword === 'format' && err.params?.format === 'date-time') {
      return `${path}: Invalid date-time format. Use ISO8601 format (e.g., 2024-01-15T12:00:00.000Z)`;
    }
    
    if (keyword === 'pattern' && path.includes('uuid')) {
      return `${path}: Invalid UUID format. Must be a valid UUID v4`;
    }
    
    return `${path}: ${message}`;
  });
}