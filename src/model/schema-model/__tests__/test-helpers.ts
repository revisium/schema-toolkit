import type { JsonObjectSchema, JsonSchema } from '../../../types/index.js';
import { obj, str, num, arr, ref } from '../../../mocks/schema.mocks.js';
import { createSchemaModel } from '../SchemaModelImpl.js';
import type { SchemaModel } from '../types.js';

export const emptySchema = (): JsonObjectSchema => obj({});

export const simpleSchema = (): JsonObjectSchema =>
  obj({
    name: str(),
    age: num(),
  });

export const nestedSchema = (): JsonObjectSchema =>
  obj({
    user: obj({
      firstName: str(),
      lastName: str(),
    }),
  });

export const arraySchema = (): JsonObjectSchema =>
  obj({
    items: arr(str()),
  });

export const schemaWithMetadata = (): JsonObjectSchema =>
  obj({
    field: str({ title: 'Field Title', description: 'Field description', deprecated: true }),
  });

export const schemaWithFormula = (): JsonObjectSchema =>
  obj({
    price: num(),
    quantity: num(),
    total: num({ readOnly: true, formula: 'price * quantity' }),
  });

export const schemaWithForeignKey = (): JsonObjectSchema =>
  obj({
    categoryId: str({ foreignKey: 'categories' }),
  });

export const selfRefSchema = (): { schema: JsonObjectSchema; refSchemas: Record<string, JsonSchema> } => {
  const schema = obj({
    name: str(),
    child: ref('self'),
  });
  return { schema, refSchemas: { self: schema } };
};

export const selfRefArraySchema = (): { schema: JsonObjectSchema; refSchemas: Record<string, JsonSchema> } => {
  const schema = obj({
    name: str(),
    children: arr(ref('self')),
  });
  return { schema, refSchemas: { self: schema } };
};

export const createModel = (schema: JsonObjectSchema): SchemaModel => {
  return createSchemaModel(schema);
};

export const findNodeIdByName = (model: SchemaModel, name: string): string | undefined => {
  const root = model.root;
  for (const prop of root.properties()) {
    if (prop.name() === name) {
      return prop.id();
    }
  }
  return undefined;
};

export const findNestedNodeId = (
  model: SchemaModel,
  parentName: string,
  childName: string,
): string | undefined => {
  const root = model.root;
  for (const prop of root.properties()) {
    if (prop.name() === parentName) {
      for (const child of prop.properties()) {
        if (child.name() === childName) {
          return child.id();
        }
      }
    }
  }
  return undefined;
};
