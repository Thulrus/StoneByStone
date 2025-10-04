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
    return `${path}: ${message}`;
  });
}