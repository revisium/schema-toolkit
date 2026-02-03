const FIELD_NAME_PATTERN = /^(?!__)[a-zA-Z_][a-zA-Z0-9-_]*$/;
const FIELD_NAME_MAX_LENGTH = 64;

export const FIELD_NAME_ERROR_MESSAGE =
  'Must start with a letter or underscore, cannot start with __, and can only include letters, numbers, hyphens, and underscores (max 64 chars)';

export function isValidFieldName(name: string): boolean {
  if (name.length === 0 || name.length > FIELD_NAME_MAX_LENGTH) {
    return false;
  }
  return FIELD_NAME_PATTERN.test(name);
}
