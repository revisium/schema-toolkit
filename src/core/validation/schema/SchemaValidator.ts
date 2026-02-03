import type { SchemaNode } from '../../schema-node/index.js';
import type { SchemaValidationError, SchemaValidationErrorType } from './types.js';
import { isValidFieldName, FIELD_NAME_ERROR_MESSAGE } from './FieldNameValidator.js';

export function validateSchema(root: SchemaNode): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];
  collectValidationErrors(root, errors);
  return errors;
}

function collectValidationErrors(
  node: SchemaNode,
  errors: SchemaValidationError[],
): void {
  if (node.isNull()) {
    return;
  }

  if (node.isObject()) {
    const children = node.properties();
    const nameSet = new Set<string>();

    for (const child of children) {
      const childName = child.name();

      if (childName === '') {
        errors.push(createError(child.id(), 'empty-name', 'Field name cannot be empty'));
      } else if (nameSet.has(childName)) {
        errors.push(
          createError(child.id(), 'duplicate-name', `Duplicate field name: ${childName}`),
        );
      } else if (!isValidFieldName(childName)) {
        errors.push(createError(child.id(), 'invalid-name', FIELD_NAME_ERROR_MESSAGE));
      }

      nameSet.add(childName);
      collectValidationErrors(child, errors);
    }
  } else if (node.isArray()) {
    collectValidationErrors(node.items(), errors);
  }
}

function createError(
  nodeId: string,
  type: SchemaValidationErrorType,
  message: string,
): SchemaValidationError {
  return { nodeId, type, message };
}
