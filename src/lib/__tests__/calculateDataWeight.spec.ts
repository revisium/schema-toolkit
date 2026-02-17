import {
  getStringSchema,
  getNumberSchema,
  getBooleanSchema,
  getObjectSchema,
  getArraySchema,
} from '../../mocks/schema.mocks.js';
import { JsonObject } from '../../types/json.types.js';
import { createJsonSchemaStore } from '../createJsonSchemaStore.js';
import { createJsonValueStore } from '../createJsonValueStore.js';
import {
  calculateDataWeight,
  calculateDataWeightFromStore,
} from '../calculateDataWeight.js';

const createStore = (
  schema: ReturnType<typeof getObjectSchema>,
  value: JsonObject,
) => createJsonValueStore(createJsonSchemaStore(schema), '', value);

describe('calculateDataWeight', () => {
  it('should handle empty object', () => {
    const result = calculateDataWeight({});

    expect(result).toEqual({
      totalBytes: 2,
      totalNodes: 1,
      maxDepth: 0,
      maxArrayLength: 0,
      maxStringLength: 0,
      totalStringsLength: 0,
    });
  });

  it('should count primitive values', () => {
    const result = calculateDataWeight({ name: 'Alice', age: 30, active: true });

    expect(result).toEqual({
      totalBytes: 39,
      totalNodes: 4,
      maxDepth: 1,
      maxArrayLength: 0,
      maxStringLength: 5,
      totalStringsLength: 5,
    });
  });

  it('should track max array length', () => {
    const result = calculateDataWeight({ items: [1, 2, 3, 4, 5], tags: ['a', 'b'] });

    expect(result).toEqual({
      totalBytes: 38,
      totalNodes: 10,
      maxDepth: 2,
      maxArrayLength: 5,
      maxStringLength: 1,
      totalStringsLength: 2,
    });
  });

  it('should track max string length', () => {
    const result = calculateDataWeight({ short: 'ab', long: 'hello world' });

    expect(result).toEqual({
      totalBytes: 35,
      totalNodes: 3,
      maxDepth: 1,
      maxArrayLength: 0,
      maxStringLength: 11,
      totalStringsLength: 13,
    });
  });

  it('should sum all string bytes', () => {
    const result = calculateDataWeight({ a: 'foo', b: 'bar', c: 'baz' });

    expect(result).toEqual({
      totalBytes: 31,
      totalNodes: 4,
      maxDepth: 1,
      maxArrayLength: 0,
      maxStringLength: 3,
      totalStringsLength: 9,
    });
  });

  it('should handle nested objects', () => {
    const result = calculateDataWeight({
      level1: {
        level2: {
          value: 'deep',
        },
      },
    });

    expect(result).toEqual({
      totalBytes: 38,
      totalNodes: 4,
      maxDepth: 3,
      maxArrayLength: 0,
      maxStringLength: 4,
      totalStringsLength: 4,
    });
  });

  it('should handle nested arrays', () => {
    const result = calculateDataWeight({
      matrix: [
        [1, 2],
        [3, 4, 5],
      ],
    });

    expect(result).toEqual({
      totalBytes: 26,
      totalNodes: 9,
      maxDepth: 3,
      maxArrayLength: 3,
      maxStringLength: 0,
      totalStringsLength: 0,
    });
  });

  it('should handle null values', () => {
    const result = calculateDataWeight({ a: null, b: 'test' });

    expect(result).toEqual({
      totalBytes: 21,
      totalNodes: 3,
      maxDepth: 1,
      maxArrayLength: 0,
      maxStringLength: 4,
      totalStringsLength: 4,
    });
  });

  it('should handle empty arrays', () => {
    const result = calculateDataWeight({ items: [] });

    expect(result).toEqual({
      totalBytes: 12,
      totalNodes: 2,
      maxDepth: 1,
      maxArrayLength: 0,
      maxStringLength: 0,
      totalStringsLength: 0,
    });
  });

  it('should handle array of objects', () => {
    const result = calculateDataWeight({
      users: [
        { name: 'Alice', tags: ['admin', 'user'] },
        { name: 'Bob', tags: ['user'] },
      ],
    });

    expect(result).toEqual({
      totalBytes: 83,
      totalNodes: 11,
      maxDepth: 4,
      maxArrayLength: 2,
      maxStringLength: 5,
      totalStringsLength: 21,
    });
  });

  it('should count all nodes including containers', () => {
    const result = calculateDataWeight({ arr: [1, 2], obj: { x: 'y' } });

    expect(result).toEqual({
      totalBytes: 29,
      totalNodes: 6,
      maxDepth: 2,
      maxArrayLength: 2,
      maxStringLength: 1,
      totalStringsLength: 1,
    });
  });
});

describe('calculateDataWeightFromStore', () => {
  it('should handle empty object', () => {
    const store = createStore(getObjectSchema({}), {});

    const result = calculateDataWeightFromStore(store);

    expect(result).toEqual({
      totalBytes: 2,
      totalNodes: 1,
      maxDepth: 0,
      maxArrayLength: 0,
      maxStringLength: 0,
      totalStringsLength: 0,
    });
  });

  it('should count primitive values', () => {
    const store = createStore(
      getObjectSchema({
        name: getStringSchema(),
        age: getNumberSchema(),
        active: getBooleanSchema(),
      }),
      { name: 'Alice', age: 30, active: true },
    );

    const result = calculateDataWeightFromStore(store);

    expect(result).toEqual({
      totalBytes: 39,
      totalNodes: 4,
      maxDepth: 1,
      maxArrayLength: 0,
      maxStringLength: 5,
      totalStringsLength: 5,
    });
  });

  it('should handle nested objects', () => {
    const store = createStore(
      getObjectSchema({
        level1: getObjectSchema({
          level2: getObjectSchema({
            value: getStringSchema(),
          }),
        }),
      }),
      { level1: { level2: { value: 'deep' } } },
    );

    const result = calculateDataWeightFromStore(store);

    expect(result).toEqual({
      totalBytes: 38,
      totalNodes: 4,
      maxDepth: 3,
      maxArrayLength: 0,
      maxStringLength: 4,
      totalStringsLength: 4,
    });
  });

  it('should handle arrays', () => {
    const store = createStore(
      getObjectSchema({
        tags: getArraySchema(getStringSchema()),
      }),
      { tags: ['admin', 'user'] },
    );

    const result = calculateDataWeightFromStore(store);

    expect(result).toEqual({
      totalBytes: 25,
      totalNodes: 4,
      maxDepth: 2,
      maxArrayLength: 2,
      maxStringLength: 5,
      totalStringsLength: 9,
    });
  });

  it('should handle array of objects', () => {
    const store = createStore(
      getObjectSchema({
        users: getArraySchema(
          getObjectSchema({
            name: getStringSchema(),
            score: getNumberSchema(),
          }),
        ),
      }),
      {
        users: [
          { name: 'Alice', score: 10 },
          { name: 'Bob', score: 20 },
        ],
      },
    );

    const result = calculateDataWeightFromStore(store);

    expect(result).toEqual({
      totalBytes: 65,
      totalNodes: 8,
      maxDepth: 3,
      maxArrayLength: 2,
      maxStringLength: 5,
      totalStringsLength: 8,
    });
  });

  it('should match calculateDataWeight for same data', () => {
    const data = { name: 'test', count: 42, active: false };
    const store = createStore(
      getObjectSchema({
        name: getStringSchema(),
        count: getNumberSchema(),
        active: getBooleanSchema(),
      }),
      data,
    );

    const fromData = calculateDataWeight(data);
    const fromStore = calculateDataWeightFromStore(store);

    expect(fromStore).toEqual(fromData);
  });
});
