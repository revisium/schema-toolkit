import { obj, str, num, bool, arr, ref } from '../../../mocks/schema.mocks.js';
import type { JsonObjectSchema, JsonSchema } from '../../../types/index.js';
import { createSchemaModel } from '../../schema-model/SchemaModelImpl.js';
import type { SchemaModel, RefSchemas } from '../../schema-model/types.js';
import type { SchemaNode } from '../../../core/schema-node/index.js';

export { obj, str, num, bool, arr, ref };

export const createModel = (
  schema: JsonObjectSchema,
  refSchemas?: RefSchemas,
): SchemaModel => {
  return createSchemaModel(schema, { refSchemas });
};

export const getFieldNode = (model: SchemaModel, name: string): SchemaNode => {
  return model.root.property(name);
};

export const getNestedFieldNode = (
  model: SchemaModel,
  parentName: string,
  childName: string,
): SchemaNode => {
  return model.root.property(parentName).property(childName);
};

export const customRefSchemas: RefSchemas = {
  'urn:custom:schema': obj({
    id: str(),
    value: num(),
  }) as unknown as JsonSchema,
};
