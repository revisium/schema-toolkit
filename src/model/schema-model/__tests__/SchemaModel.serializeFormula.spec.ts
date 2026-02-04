import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import { JsonSchemaTypeName, type JsonObjectSchema } from '../../../types/index.js';
import { findNodeIdByName, findNestedNodeId } from './test-helpers.js';

describe('SchemaModel serializeFormula', () => {
  const schemaWithFormulaInNested = (): JsonObjectSchema => ({
    type: JsonSchemaTypeName.Object,
    additionalProperties: false,
    required: ['value', 'nested'],
    properties: {
      value: {
        type: JsonSchemaTypeName.Number,
        default: 0,
      },
      nested: {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['sum'],
        properties: {
          sum: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': {
              version: 1,
              expression: '../value + 2',
            },
          },
        },
      },
    },
  });

  describe('serializeFormula', () => {
    it('returns empty string for node without formula', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['field'],
        properties: {
          field: { type: JsonSchemaTypeName.String, default: '' },
        },
      };
      const model = createSchemaModel(schema);
      const fieldId = findNodeIdByName(model, 'field');

      expect(model.serializeFormula(fieldId!)).toBe('');
    });

    it('returns serialized formula for node with formula', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['price', 'total'],
        properties: {
          price: {
            type: JsonSchemaTypeName.Number,
            default: 0,
          },
          total: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': {
              version: 1,
              expression: 'price * 2',
            },
          },
        },
      };
      const model = createSchemaModel(schema);
      const totalId = findNodeIdByName(model, 'total');

      expect(model.serializeFormula(totalId!)).toBe('price * 2');
    });

    it('updates relative path when node is moved', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: ['value', 'sum', 'target'],
        properties: {
          value: {
            type: JsonSchemaTypeName.Number,
            default: 0,
          },
          sum: {
            type: JsonSchemaTypeName.Number,
            default: 0,
            readOnly: true,
            'x-formula': {
              version: 1,
              expression: 'value + 2',
            },
          },
          target: {
            type: JsonSchemaTypeName.Object,
            additionalProperties: false,
            required: [],
            properties: {},
          },
        },
      };
      const model = createSchemaModel(schema);
      const sumId = findNodeIdByName(model, 'sum');
      const targetId = findNodeIdByName(model, 'target');

      expect(model.serializeFormula(sumId!)).toBe('value + 2');

      model.moveNode(sumId!, targetId!);

      expect(model.serializeFormula(sumId!)).toBe('../value + 2');
    });

    it('serializes nested formula with relative path', () => {
      const model = createSchemaModel(schemaWithFormulaInNested());
      const sumId = findNestedNodeId(model, 'nested', 'sum');

      expect(model.serializeFormula(sumId!)).toBe('../value + 2');
    });

    it('updates path when formula node moved to root', () => {
      const model = createSchemaModel(schemaWithFormulaInNested());
      const sumId = findNestedNodeId(model, 'nested', 'sum');
      const rootId = model.root.id();

      expect(model.serializeFormula(sumId!)).toBe('../value + 2');

      model.moveNode(sumId!, rootId);

      expect(model.serializeFormula(sumId!)).toBe('value + 2');
    });

    it('returns empty string for non-existent node', () => {
      const schema: JsonObjectSchema = {
        type: JsonSchemaTypeName.Object,
        additionalProperties: false,
        required: [],
        properties: {},
      };
      const model = createSchemaModel(schema);

      expect(model.serializeFormula('non-existent')).toBe('');
    });
  });
});
