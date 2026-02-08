import { JsonSchema } from '../types/schema.types.js';
import { JsonSchemaStore } from '../model/schema/json-schema.store.js';
import { createJsonSchemaStore } from './createJsonSchemaStore.js';
import { traverseStore } from './traverseStore.js';
import { validateJsonFieldName } from './validateJsonFieldName.js';

export const getInvalidFieldNamesInSchema = (
  schema: JsonSchema,
  refs: Record<string, JsonSchema> = {},
) => {
  const schemaStore = createJsonSchemaStore(schema, refs);

  const invalidFields: JsonSchemaStore[] = [];

  traverseStore(schemaStore, (item) => {
    if (item.parent?.type === 'object') {
      if (!validateJsonFieldName(item.name)) {
        invalidFields.push(item);
      }
    }
  });

  return invalidFields;
};
