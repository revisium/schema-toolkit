import {
  getArraySchema,
  getNumberSchema,
  getObjectSchema,
  getStringSchema,
} from '../../mocks/schema.mocks.js';
import { JsonObject } from '../../types/json.types.js';
import { createJsonSchemaStore } from '../createJsonSchemaStore.js';
import { createJsonValueStore } from '../createJsonValueStore.js';
import { JsonArrayValueStore } from '../../model/value/json-array-value.store.js';
import { JsonObjectValueStore } from '../../model/value/json-object-value.store.js';

describe('createJsonValueStore', () => {
  it('object', () => {
    const schema = getObjectSchema({
      fieldString: getStringSchema(),
      fieldArray: getArraySchema(getNumberSchema()),
      nested: getObjectSchema({ value: getNumberSchema() }),
    });

    const value: JsonObject = {
      fieldString: 'field',
      fieldArray: [1, 2, 3, 4, 5],
      nested: {
        value: 100,
      },
    };

    const root = createJsonValueStore(
      createJsonSchemaStore(schema),
      '',
      value,
    ) as JsonObjectValueStore;
    const array = root.value['fieldArray'] as JsonArrayValueStore;
    const nested = root.value['nested'] as JsonObjectValueStore;

    expect(root.value['fieldString'].parent).toBe(root);
    expect(array.parent).toBe(root);
    for (const arrayValue of array.value) {
      expect(arrayValue.parent).toBe(array);
    }
    expect(nested.parent).toBe(root);
    expect(nested.value['value'].parent).toBe(nested);

    const expectedValue = root.getPlainValue();
    expect(expectedValue).toStrictEqual(value);
  });

  it('arrays of objects', () => {
    const schema = getObjectSchema({
      items: getArraySchema(
        getObjectSchema({
          field: getStringSchema(),
          ids: getArraySchema(getNumberSchema()),
        }),
      ),
    });

    const value: JsonObject = {
      items: [
        {
          field: 'field1',
          ids: [1, 2, 3],
        },
        {
          field: 'field2',
          ids: [5, 6, 7, 8, 9],
        },
      ],
    };

    const root = createJsonValueStore(
      createJsonSchemaStore(schema),
      '',
      value,
    ) as JsonObjectValueStore;
    const array = root.value['items'] as JsonArrayValueStore;

    expect(array.parent).toBe(root);
    for (const arrayValueObject of array.value) {
      const object = arrayValueObject as JsonObjectValueStore;
      expect(object.parent).toBe(array);
      expect(object.value['field'].parent).toBe(object);

      const arrayIds = object.value['ids'] as JsonArrayValueStore;
      expect(arrayIds.parent).toBe(object);

      for (const arrayValueId of arrayIds.value) {
        expect(arrayValueId.parent).toBe(arrayIds);
      }
    }

    const expectedValue = root.getPlainValue();
    expect(expectedValue).toStrictEqual(value);
  });

  it('unexpected field in value', () => {
    const schema = getObjectSchema({
      value: getObjectSchema({
        field1: getStringSchema(),
      }),
    });

    const value: JsonObject = {
      value: {
        field1: 'field1',
        field2: 'field2',
      },
    };

    expect(() =>
      createJsonValueStore(
        createJsonSchemaStore(schema),
        '',
        value,
      ).getPlainValue(),
    ).toThrowError('Invalid item');
  });

  it('no match with schema', () => {
    const schema = getObjectSchema({
      value: getObjectSchema({
        fieldSchema: getStringSchema(),
      }),
    });

    const value: JsonObject = {
      value: {
        fieldValue: 'fieldValue',
      },
    };

    expect(() =>
      createJsonValueStore(
        createJsonSchemaStore(schema),
        '',
        value,
      ).getPlainValue(),
    ).toThrowError('Invalid item');
  });
});
