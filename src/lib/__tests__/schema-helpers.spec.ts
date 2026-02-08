import {
  str,
  num,
  bool,
  obj,
  arr,
  ref,
  getStringSchema,
  getNumberSchema,
  getBooleanSchema,
  getObjectSchema,
  getArraySchema,
  getRefSchema,
  getReplacePatch,
  getRemovePatch,
  getAddPatch,
  getMovePatch,
} from '../schema-helpers.js';

describe('schema-helpers', () => {
  describe('str / getStringSchema', () => {
    it('returns correct schema with defaults', () => {
      const schema = str();
      expect(schema).toEqual({
        type: 'string',
        default: '',
      });
    });

    it('merges options', () => {
      const schema = str({ required: true, minLength: 3, maxLength: 10 });
      expect(schema.type).toBe('string');
      expect(schema.default).toBe('');
      expect(schema.required).toBe(true);
      expect(schema.minLength).toBe(3);
      expect(schema.maxLength).toBe(10);
    });

    it('overrides default value', () => {
      const schema = str({ default: 'hello' });
      expect(schema.default).toBe('hello');
    });

    it('adds x-formula when formula provided', () => {
      const schema = str({ formula: 'A + B' });
      expect(schema['x-formula']).toEqual({ version: 1, expression: 'A + B' });
    });

    it('does not add x-formula when formula is empty', () => {
      const schema = str({});
      expect(schema['x-formula']).toBeUndefined();
    });

    it('getStringSchema is equivalent to str', () => {
      expect(getStringSchema({ minLength: 5 })).toEqual(str({ minLength: 5 }));
    });
  });

  describe('num / getNumberSchema', () => {
    it('returns correct schema with defaults', () => {
      const schema = num();
      expect(schema).toEqual({
        type: 'number',
        default: 0,
      });
    });

    it('merges options', () => {
      const schema = num({ minimum: 0, maximum: 100 });
      expect(schema.minimum).toBe(0);
      expect(schema.maximum).toBe(100);
    });

    it('adds x-formula', () => {
      const schema = num({ formula: 'x * 2' });
      expect(schema['x-formula']).toEqual({ version: 1, expression: 'x * 2' });
    });

    it('getNumberSchema is equivalent to num', () => {
      expect(getNumberSchema()).toEqual(num());
    });
  });

  describe('bool / getBooleanSchema', () => {
    it('returns correct schema with defaults', () => {
      const schema = bool();
      expect(schema).toEqual({
        type: 'boolean',
        default: false,
      });
    });

    it('overrides default value', () => {
      const schema = bool({ default: true });
      expect(schema.default).toBe(true);
    });

    it('adds x-formula', () => {
      const schema = bool({ formula: 'a > b' });
      expect(schema['x-formula']).toEqual({ version: 1, expression: 'a > b' });
    });

    it('getBooleanSchema is equivalent to bool', () => {
      expect(getBooleanSchema()).toEqual(bool());
    });
  });

  describe('obj / getObjectSchema', () => {
    it('returns correct schema with properties', () => {
      const schema = obj({ name: str(), age: num() });
      expect(schema.type).toBe('object');
      expect(schema.additionalProperties).toBe(false);
      expect(schema.required).toEqual(['age', 'name']);
      expect(schema.properties.name.type).toBe('string');
      expect(schema.properties.age.type).toBe('number');
    });

    it('sorts required keys alphabetically', () => {
      const schema = obj({ z: str(), a: str(), m: str() });
      expect(schema.required).toEqual(['a', 'm', 'z']);
    });

    it('accepts options', () => {
      const schema = obj({ x: str() }, { description: 'test' });
      expect(schema.description).toBe('test');
    });

    it('getObjectSchema is equivalent to obj', () => {
      const props = { name: str() };
      expect(getObjectSchema(props)).toEqual(obj(props));
    });
  });

  describe('arr / getArraySchema', () => {
    it('returns correct schema with items', () => {
      const schema = arr(str());
      expect(schema.type).toBe('array');
      expect(schema.items.type).toBe('string');
    });

    it('accepts options', () => {
      const schema = arr(num(), { description: 'numbers' });
      expect(schema.description).toBe('numbers');
    });

    it('getArraySchema is equivalent to arr', () => {
      expect(getArraySchema(str())).toEqual(arr(str()));
    });
  });

  describe('ref / getRefSchema', () => {
    it('returns ref schema', () => {
      const schema = ref('users');
      expect(schema).toEqual({ $ref: 'users' });
    });

    it('accepts options', () => {
      const schema = ref('users', { title: 'User ref', deprecated: true });
      expect(schema.$ref).toBe('users');
      expect(schema.title).toBe('User ref');
      expect(schema.deprecated).toBe(true);
    });

    it('getRefSchema is equivalent to ref', () => {
      expect(getRefSchema('t')).toEqual(ref('t'));
    });
  });

  describe('patch helpers', () => {
    it('getReplacePatch', () => {
      const patch = getReplacePatch({ path: '/name', value: str() });
      expect(patch).toEqual({ op: 'replace', path: '/name', value: str() });
    });

    it('getRemovePatch', () => {
      const patch = getRemovePatch({ path: '/name' });
      expect(patch).toEqual({ op: 'remove', path: '/name' });
    });

    it('getAddPatch', () => {
      const patch = getAddPatch({ path: '/name', value: num() });
      expect(patch).toEqual({ op: 'add', path: '/name', value: num() });
    });

    it('getMovePatch', () => {
      const patch = getMovePatch({ from: '/old', path: '/new' });
      expect(patch).toEqual({ op: 'move', from: '/old', path: '/new' });
    });
  });
});
