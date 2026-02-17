import { JsonObjectSchema } from '../types/schema.types.js';
import { RevisiumValidator } from './createRevisiumValidator.js';

export interface MetaSchemaValidationResult {
  valid: boolean;
  errors?: string[];
}

let cachedValidator: RevisiumValidator | null = null;

const getValidator = (): RevisiumValidator => {
  if (cachedValidator) {
    return cachedValidator;
  }

  cachedValidator = new RevisiumValidator();
  return cachedValidator;
};

export const validateRevisiumSchema = (
  schema: JsonObjectSchema,
): MetaSchemaValidationResult => {
  const validator = getValidator();
  const valid = validator.validateMetaSchema(schema);

  if (valid) {
    return { valid: true };
  }

  const errors = (validator.validateMetaSchema.errors ?? []).map((err) => {
    const path = err.instancePath || '/';
    return `${path}: ${err.message ?? 'unknown error'}`;
  });

  return { valid: false, errors };
};
