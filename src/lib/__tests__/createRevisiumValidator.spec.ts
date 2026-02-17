import { SystemSchemaIds } from '../../consts/system-schema-ids.js';
import { RevisiumValidator } from '../createRevisiumValidator.js';

describe('RevisiumValidator', () => {
  let validator: RevisiumValidator;

  beforeAll(() => {
    validator = new RevisiumValidator();
  });

  describe('validateMetaSchema', () => {
    it('accepts valid schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string', default: '' },
        },
        additionalProperties: false,
        required: ['name'],
      };

      expect(validator.validateMetaSchema(schema)).toBe(true);
      expect(validator.validateMetaSchema.errors).toBeNull();
    });

    it('rejects schema missing default', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        additionalProperties: false,
        required: ['name'],
      };

      expect(validator.validateMetaSchema(schema)).toBe(false);
      expect(validator.validateMetaSchema.errors).not.toBeNull();
    });
  });

  describe('validateJsonPatch', () => {
    it('accepts valid patch', () => {
      const patch = [
        {
          op: 'add',
          path: '/field',
          value: { type: 'string', default: '' },
        },
      ];

      expect(validator.validateJsonPatch(patch)).toBe(true);
      expect(validator.validateJsonPatch.errors).toBeNull();
    });

    it('rejects patch missing op', () => {
      const patch = [{ path: '/field' }];

      expect(validator.validateJsonPatch(patch)).toBe(false);
      expect(validator.validateJsonPatch.errors).not.toBeNull();
    });
  });

  describe('validateMigrations', () => {
    it('accepts valid init migration', () => {
      const migration = {
        changeType: 'init',
        tableId: 'table1',
        hash: 'abc123',
        id: 'mig1',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string', default: '' },
          },
          additionalProperties: false,
          required: ['name'],
        },
      };

      expect(validator.validateMigrations(migration)).toBe(true);
      expect(validator.validateMigrations.errors).toBeNull();
    });

    it('accepts valid update migration', () => {
      const migration = {
        changeType: 'update',
        tableId: 'table1',
        hash: 'abc123',
        id: 'mig2',
        patches: [
          {
            op: 'add',
            path: '/age',
            value: { type: 'number', default: 0 },
          },
        ],
      };

      expect(validator.validateMigrations(migration)).toBe(true);
      expect(validator.validateMigrations.errors).toBeNull();
    });

    it('accepts valid rename migration', () => {
      const migration = {
        changeType: 'rename',
        id: 'mig3',
        tableId: 'table1',
        nextTableId: 'table2',
      };

      expect(validator.validateMigrations(migration)).toBe(true);
      expect(validator.validateMigrations.errors).toBeNull();
    });

    it('accepts valid remove migration', () => {
      const migration = {
        changeType: 'remove',
        id: 'mig4',
        tableId: 'table1',
      };

      expect(validator.validateMigrations(migration)).toBe(true);
      expect(validator.validateMigrations.errors).toBeNull();
    });

    it('rejects invalid migration', () => {
      const migration = {
        changeType: 'unknown',
        tableId: 'table1',
      };

      expect(validator.validateMigrations(migration)).toBe(false);
      expect(validator.validateMigrations.errors).not.toBeNull();
    });
  });

  describe('validateHistoryPatches', () => {
    it('accepts valid history patches', () => {
      const data = [
        {
          patches: [
            {
              op: 'add',
              path: '/field',
              value: { type: 'string', default: '' },
            },
          ],
          hash: 'abc123',
        },
      ];

      expect(validator.validateHistoryPatches(data)).toBe(true);
      expect(validator.validateHistoryPatches.errors).toBeNull();
    });

    it('rejects invalid history patches', () => {
      const data = [{ hash: 'abc123' }];

      expect(validator.validateHistoryPatches(data)).toBe(false);
      expect(validator.validateHistoryPatches.errors).not.toBeNull();
    });
  });

  describe('validateTableViews', () => {
    it('accepts valid views data', () => {
      const data = {
        version: 1,
        defaultViewId: 'default',
        views: [{ id: 'default', name: 'Default' }],
      };

      expect(validator.validateTableViews(data)).toBe(true);
      expect(validator.validateTableViews.errors).toBeNull();
    });

    it('rejects invalid views data', () => {
      const data = {
        version: 'not-a-number',
        views: [],
      };

      expect(validator.validateTableViews(data)).toBe(false);
      expect(validator.validateTableViews.errors).not.toBeNull();
    });
  });

  describe('compile', () => {
    it('validates data against dynamic user schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'age'],
        additionalProperties: false,
      };

      const validate = validator.compile(schema);

      expect(validate({ name: 'Alice', age: 30 })).toBe(true);
      expect(validate.errors).toBeNull();

      expect(validate({ name: 'Alice' })).toBe(false);
      expect(validate.errors).not.toBeNull();
    });

    it('caches compiled validators', () => {
      const schema = {
        type: 'object',
        properties: { x: { type: 'number' } },
        required: ['x'],
      };

      const fn1 = validator.compile(schema);
      const fn2 = validator.compile(schema);

      expect(fn1).toBe(fn2);
    });

    it('resolves $ref to plugin schemas', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { $ref: SystemSchemaIds.RowId },
        },
        required: ['id'],
      };

      const validate = validator.compile(schema);

      expect(validate({ id: 'row-1' })).toBe(true);
      expect(validate.errors).toBeNull();

      expect(validate({ id: 123 })).toBe(false);
      expect(validate.errors).not.toBeNull();
    });
  });

  describe('regex format', () => {
    it('accepts valid regex pattern in meta schema', () => {
      const schema = {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            default: '',
            pattern: '^[A-Z]{3}$',
          },
        },
        additionalProperties: false,
        required: ['code'],
      };

      expect(validator.validateMetaSchema(schema)).toBe(true);
      expect(validator.validateMetaSchema.errors).toBeNull();
    });

    it('rejects invalid regex pattern in meta schema', () => {
      const schema = {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            default: '',
            pattern: '[invalid',
          },
        },
        additionalProperties: false,
        required: ['code'],
      };

      expect(validator.validateMetaSchema(schema)).toBe(false);
      expect(validator.validateMetaSchema.errors).not.toBeNull();
    });
  });

  describe('custom keywords', () => {
    it('accepts schema with foreignKey', () => {
      const schema = {
        type: 'object',
        properties: {
          authorId: {
            type: 'string',
            default: '',
            foreignKey: 'authors',
          },
        },
        additionalProperties: false,
        required: ['authorId'],
      };

      expect(validator.validateMetaSchema(schema)).toBe(true);
      expect(validator.validateMetaSchema.errors).toBeNull();
    });

    it('accepts schema with x-formula', () => {
      const schema = {
        type: 'object',
        properties: {
          total: {
            type: 'number',
            default: 0,
            readOnly: true,
            'x-formula': { version: 1, expression: 'price * qty' },
          },
        },
        additionalProperties: false,
        required: ['total'],
      };

      expect(validator.validateMetaSchema(schema)).toBe(true);
      expect(validator.validateMetaSchema.errors).toBeNull();
    });
  });

  describe('error structure', () => {
    it('returns ValidationError with expected fields', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const validate = validator.compile(schema);
      validate({});

      expect(validate.errors).not.toBeNull();
      expect(validate.errors!.length).toBeGreaterThan(0);
      const error = validate.errors![0]!;
      expect(error).toHaveProperty('instancePath');
      expect(error).toHaveProperty('keyword');
      expect(error).toHaveProperty('params');
      expect(typeof error.keyword).toBe('string');
      expect(typeof error.params).toBe('object');
    });

    it('returns null errors on success', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const validate = validator.compile(schema);
      validate({ name: 'test' });

      expect(validate.errors).toBeNull();
    });
  });
});
