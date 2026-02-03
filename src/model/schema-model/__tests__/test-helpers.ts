import type { JsonObjectSchema } from '../../../types/index.js';
import { JsonSchemaTypeName } from '../../../types/index.js';
import { createSchemaModel } from '../SchemaModelImpl.js';
import type { SchemaModel } from '../types.js';

export const emptySchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: [],
  properties: {},
});

export const simpleSchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['name', 'age'],
  properties: {
    name: {
      type: JsonSchemaTypeName.String,
      default: '',
    },
    age: {
      type: JsonSchemaTypeName.Number,
      default: 0,
    },
  },
});

export const nestedSchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['user'],
  properties: {
    user: {
      type: JsonSchemaTypeName.Object,
      additionalProperties: false,
      required: ['firstName', 'lastName'],
      properties: {
        firstName: {
          type: JsonSchemaTypeName.String,
          default: '',
        },
        lastName: {
          type: JsonSchemaTypeName.String,
          default: '',
        },
      },
    },
  },
});

export const arraySchema = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: JsonSchemaTypeName.Array,
      items: {
        type: JsonSchemaTypeName.String,
        default: '',
      },
    },
  },
});

export const schemaWithMetadata = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['field'],
  properties: {
    field: {
      type: JsonSchemaTypeName.String,
      default: '',
      title: 'Field Title',
      description: 'Field description',
      deprecated: true,
    },
  },
});

export const schemaWithFormula = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['price', 'quantity', 'total'],
  properties: {
    price: {
      type: JsonSchemaTypeName.Number,
      default: 0,
    },
    quantity: {
      type: JsonSchemaTypeName.Number,
      default: 0,
    },
    total: {
      type: JsonSchemaTypeName.Number,
      default: 0,
      readOnly: true,
      'x-formula': {
        version: 1,
        expression: 'price * quantity',
      },
    },
  },
});

export const schemaWithForeignKey = (): JsonObjectSchema => ({
  type: JsonSchemaTypeName.Object,
  additionalProperties: false,
  required: ['categoryId'],
  properties: {
    categoryId: {
      type: JsonSchemaTypeName.String,
      default: '',
      foreignKey: 'categories',
    },
  },
});

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
