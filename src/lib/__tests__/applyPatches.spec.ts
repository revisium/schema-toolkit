import {
  getAddPatch,
  getArraySchema,
  getBooleanSchema,
  getMovePatch,
  getNumberSchema,
  getObjectSchema,
  getRefSchema,
  getRemovePatch,
  getReplacePatch,
  getStringSchema,
} from '../../mocks/schema.mocks.js';
import { SystemSchemaIds } from '../../consts/system-schema-ids.js';
import { fileSchema } from '../../plugins/file-schema.js';
import { SchemaTable } from '../schema-table.js';
import { JsonPatch } from '../../types/json-patch.types.js';
import { JsonSchema, JsonSchemaPrimitives } from '../../types/schema.types.js';

describe('applyPatches', () => {
  describe('replace', () => {
    it('replace root', () => {
      const schema = getObjectSchema({
        fieldString: getStringSchema(),
      });

      const replaceRootPatchString = getReplacePatch({
        path: '',
        value: getStringSchema(),
      });
      const replaceRootPatchNumber = getReplacePatch({
        path: '',
        value: getNumberSchema(),
      });

      expect(
        applyPatches(schema, [replaceRootPatchString, replaceRootPatchNumber]),
      ).toStrictEqual(replaceRootPatchNumber.value);

      expect(
        applyPatches(schema, [replaceRootPatchNumber, replaceRootPatchString]),
      ).toStrictEqual(replaceRootPatchString.value);
    });

    it('replace nested object', () => {
      const replaceNestedPatchObject = getReplacePatch({
        path: '/properties/nested/properties/value',
        value: getObjectSchema({
          sub: getStringSchema(),
        }),
      });

      const schema = getObjectSchema({
        fieldString: getStringSchema(),
        fieldArray: getArraySchema(getNumberSchema()),
        nested: getObjectSchema({ value: getNumberSchema() }),
      });

      const expectedSchema = getObjectSchema({
        fieldString: getStringSchema(),
        fieldArray: getArraySchema(getNumberSchema()),
        nested: getObjectSchema({ value: replaceNestedPatchObject.value }),
      });

      expect(applyPatches(schema, [replaceNestedPatchObject])).toStrictEqual(
        expectedSchema,
      );
    });

    it('replace nested array items with primitive', () => {
      const replaceNestedPatchString = getReplacePatch({
        path: '/properties/nested/properties/fieldArray/items',
        value: getStringSchema(),
      });

      const schema = getObjectSchema({
        fieldString: getStringSchema(),
        nested: getObjectSchema({
          fieldArray: getArraySchema(getNumberSchema()),
        }),
      });

      const expectedSchema = getObjectSchema({
        fieldString: getStringSchema(),
        nested: getObjectSchema({
          fieldArray: getArraySchema(
            replaceNestedPatchString.value as JsonSchemaPrimitives,
          ),
        }),
      });

      expect(applyPatches(schema, [replaceNestedPatchString])).toStrictEqual(
        expectedSchema,
      );
    });

    it('replace nested array items', () => {
      const replaceNestedPatchString = getReplacePatch({
        path: '/properties/nested/properties/fieldArray/items',
        value: getObjectSchema({}),
      });

      const schema = getObjectSchema({
        fieldString: getStringSchema(),
        nested: getObjectSchema({
          fieldArray: getArraySchema(getNumberSchema()),
        }),
      });

      const expectedSchema = getObjectSchema({
        fieldString: getStringSchema(),
        nested: getObjectSchema({
          fieldArray: getArraySchema(getObjectSchema({})),
        }),
      });

      expect(applyPatches(schema, [replaceNestedPatchString])).toStrictEqual(
        expectedSchema,
      );
    });

    it('replace items / items', () => {
      const replaceNestedPatchString = getReplacePatch({
        path: '/properties/fieldArray/items/items',
        value: getObjectSchema({}),
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(getArraySchema(getNumberSchema())),
      });

      const expectedSchema = getObjectSchema({
        fieldArray: getArraySchema(getArraySchema(getObjectSchema({}))),
      });

      expect(applyPatches(schema, [replaceNestedPatchString])).toStrictEqual(
        expectedSchema,
      );
    });

    it('replace items / items / properties / field', () => {
      const replaceNestedPatchString = getReplacePatch({
        path: '/properties/fieldArray/items/items/properties/field',
        value: getStringSchema(),
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(
          getArraySchema(getObjectSchema({ field: getNumberSchema() })),
        ),
      });

      const expectedSchema = getObjectSchema({
        fieldArray: getArraySchema(
          getArraySchema(getObjectSchema({ field: getStringSchema() })),
        ),
      });

      expect(applyPatches(schema, [replaceNestedPatchString])).toStrictEqual(
        expectedSchema,
      );
    });

    it('replace nested array items with ref', () => {
      const replaceNestedPatchString = getReplacePatch({
        path: '/properties/nested/properties/fieldArray/items',
        value: getRefSchema(SystemSchemaIds.File),
      });

      const schema = getObjectSchema({
        fieldString: getStringSchema(),
        nested: getObjectSchema({
          fieldArray: getArraySchema(getNumberSchema()),
        }),
      });

      const expectedSchema = getObjectSchema({
        fieldString: getStringSchema(),
        nested: getObjectSchema({
          fieldArray: getArraySchema(getRefSchema(SystemSchemaIds.File)),
        }),
      });

      expect(
        applyPatches(schema, [replaceNestedPatchString], {
          [SystemSchemaIds.File]: fileSchema,
        }),
      ).toStrictEqual(expectedSchema);
    });

    describe('values migration', () => {
      describe('special cases', () => {
        it('moving a field between parents of an object in an array', () => {
          const schemaTable = new SchemaTable(
            getArraySchema(
              getObjectSchema({
                parent: getObjectSchema({
                  field: getStringSchema(),
                }),
              }),
            ),
          );

          schemaTable.addRow('row-1', [
            { parent: { field: '1' } },
            { parent: { field: '2' } },
          ]);

          schemaTable.applyPatches([
            getMovePatch({
              from: '/items/properties/parent/properties/field',
              path: '/items/properties/field',
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual([
            { parent: {}, field: '1' },
            { parent: {}, field: '2' },
          ]);
        });

        it('moving a complex field between parents of an object in an array', () => {
          const schemaTable = new SchemaTable(
            getArraySchema(
              getObjectSchema({
                parent: getObjectSchema({
                  field: getObjectSchema({
                    str: getStringSchema(),
                    num: getNumberSchema(),
                  }),
                }),
              }),
            ),
          );

          schemaTable.addRow('row-1', [
            { parent: { field: { str: '1', num: 1 } } },
            { parent: { field: { str: '2', num: 2 } } },
          ]);

          schemaTable.addRow('row-2', [
            { parent: { field: { str: '3', num: 3 } } },
            { parent: { field: { str: '4', num: 4 } } },
            { parent: { field: { str: '5', num: 5 } } },
          ]);

          schemaTable.applyPatches([
            getMovePatch({
              from: '/items/properties/parent/properties/field',
              path: '/items/properties/field',
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual([
            { parent: {}, field: { str: '1', num: 1 } },
            { parent: {}, field: { str: '2', num: 2 } },
          ]);
          expect(schemaTable.getRow('row-2')).toEqual([
            { parent: {}, field: { str: '3', num: 3 } },
            { parent: {}, field: { str: '4', num: 4 } },
            { parent: {}, field: { str: '5', num: 5 } },
          ]);
        });

        it('moving a field from the parent object in the array to parent object', () => {
          const schemaTable = new SchemaTable(
            getObjectSchema({
              array: getArraySchema(
                getObjectSchema({
                  field: getStringSchema(),
                }),
              ),
            }),
          );

          schemaTable.addRow('row-1', {
            array: [{ field: '1' }, { field: '2' }],
          });

          schemaTable.applyPatches([
            getMovePatch({
              from: '/properties/array/items/properties/field',
              path: '/properties/field',
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual({
            field: '1',
            array: [{}, {}],
          });
        });

        it('moving a field from the parent object in the array to parent array', () => {
          const schemaTable = new SchemaTable(
            getObjectSchema({
              array: getArraySchema(
                getObjectSchema({
                  nestedArray: getArraySchema(
                    getObjectSchema({
                      field: getStringSchema(),
                    }),
                  ),
                }),
              ),
            }),
          );

          schemaTable.addRow('row-1', {
            array: [
              { nestedArray: [{ field: '1' }, { field: '2' }, { field: '3' }] },
              { nestedArray: [{ field: '4' }, { field: '4' }] },
            ],
          });

          schemaTable.applyPatches([
            getMovePatch({
              from: '/properties/array/items/properties/nestedArray/items/properties/field',
              path: '/properties/array/items/properties/field',
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual({
            array: [
              {
                field: '1',
                nestedArray: [{}, {}, {}],
              },
              { field: '2', nestedArray: [{}, {}] },
            ],
          });
        });

        it('moving a complex field from object in an array to nested array', () => {
          const schemaTable = new SchemaTable(
            getArraySchema(
              getObjectSchema({
                parent: getObjectSchema({
                  str: getStringSchema(),
                  num: getNumberSchema(),
                }),
                nestedArray: getArraySchema(
                  getObjectSchema({
                    nestedStr: getStringSchema(),
                  }),
                ),
              }),
            ),
          );

          schemaTable.addRow('row-1', [
            {
              parent: { str: '1', num: 1 },
              nestedArray: [
                { nestedStr: 'nested-1' },
                { nestedStr: 'nested-2' },
                { nestedStr: 'nested-3' },
              ],
            },
            {
              parent: { str: '2', num: 2 },
              nestedArray: [
                { nestedStr: 'nested-4' },
                { nestedStr: 'nested-5' },
              ],
            },
          ]);

          schemaTable.addRow('row-2', [
            {
              parent: { str: '3', num: 3 },
              nestedArray: [
                { nestedStr: 'nested-6' },
                { nestedStr: 'nested-7' },
                { nestedStr: 'nested-8' },
                { nestedStr: 'nested-9' },
              ],
            },
            {
              parent: { str: '4', num: 4 },
              nestedArray: [{ nestedStr: 'nested-10' }],
            },
            { parent: { str: '5', num: 5 }, nestedArray: [] },
          ]);

          schemaTable.applyPatches([
            getMovePatch({
              from: '/items/properties/parent',
              path: '/items/properties/nestedArray/items/properties/movedParent',
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual([
            {
              nestedArray: [
                {
                  movedParent: {
                    num: 1,
                    str: '1',
                  },
                  nestedStr: 'nested-1',
                },
                {
                  movedParent: {
                    num: 1,
                    str: '1',
                  },
                  nestedStr: 'nested-2',
                },
                {
                  movedParent: {
                    num: 1,
                    str: '1',
                  },
                  nestedStr: 'nested-3',
                },
              ],
            },
            {
              nestedArray: [
                {
                  movedParent: {
                    num: 2,
                    str: '2',
                  },
                  nestedStr: 'nested-4',
                },
                {
                  movedParent: {
                    num: 2,
                    str: '2',
                  },
                  nestedStr: 'nested-5',
                },
              ],
            },
          ]);
          expect(schemaTable.getRow('row-2')).toEqual([
            {
              nestedArray: [
                {
                  movedParent: {
                    num: 3,
                    str: '3',
                  },
                  nestedStr: 'nested-6',
                },
                {
                  movedParent: {
                    num: 3,
                    str: '3',
                  },
                  nestedStr: 'nested-7',
                },
                {
                  movedParent: {
                    num: 3,
                    str: '3',
                  },
                  nestedStr: 'nested-8',
                },
                {
                  movedParent: {
                    num: 3,
                    str: '3',
                  },
                  nestedStr: 'nested-9',
                },
              ],
            },
            {
              nestedArray: [
                {
                  movedParent: {
                    num: 4,
                    str: '4',
                  },
                  nestedStr: 'nested-10',
                },
              ],
            },
            {
              nestedArray: [],
            },
          ]);
        });
      });

      it.each([
        [getNumberSchema(), getStringSchema(), 12, '12'],
        [getNumberSchema(), getBooleanSchema(), 12, true],
        //
        [getStringSchema(), getNumberSchema(), '12gg', 12],
        [getStringSchema(), getBooleanSchema(), 'false', false],
        //
        [getBooleanSchema(), getStringSchema(), true, 'true'],
        [getBooleanSchema(), getNumberSchema(), true, 1],
        //
        [getStringSchema(), getArraySchema(getStringSchema()), '123', ['123']],
        [
          getArraySchema(getStringSchema()),
          getStringSchema(),
          ['123', '321'],
          '123',
        ],
        //
        [getNumberSchema(), getArraySchema(getNumberSchema()), 123, [123]],
        [getArraySchema(getNumberSchema()), getNumberSchema(), [123, 321], 123],
        //
        [getBooleanSchema(), getArraySchema(getBooleanSchema()), true, [true]],
        [
          getArraySchema(getBooleanSchema()),
          getBooleanSchema(),
          [true, false],
          true,
        ],
        //
        [getNumberSchema(), getArraySchema(getStringSchema()), 123, ['123']],
        [getNumberSchema(), getArraySchema(getBooleanSchema()), 123, [true]],
        [
          getArraySchema(getNumberSchema()),
          getStringSchema(),
          [123, 321],
          '123',
        ],
        [
          getArraySchema(getNumberSchema()),
          getBooleanSchema(),
          [123, 321],
          true,
        ],
        //
        [getStringSchema(), getArraySchema(getNumberSchema()), '123fg', [123]],
        [
          getStringSchema(),
          getArraySchema(getBooleanSchema()),
          'false',
          [false],
        ],
        [
          getArraySchema(getStringSchema()),
          getNumberSchema(),
          ['123', '321'],
          123,
        ],
        [
          getArraySchema(getStringSchema()),
          getBooleanSchema(),
          ['123', '321'],
          true,
        ],
        //
        [getBooleanSchema(), getArraySchema(getNumberSchema()), true, [1]],
        [getBooleanSchema(), getArraySchema(getStringSchema()), true, ['true']],
        [
          getArraySchema(getBooleanSchema()),
          getNumberSchema(),
          [true, false],
          1,
        ],
        [
          getArraySchema(getBooleanSchema()),
          getStringSchema(),
          [true, false],
          'true',
        ],
      ])(
        'root replacing - %#',
        (beforeSchema, afterSchema, beforeValue, nextValue) => {
          const schemaTable = new SchemaTable(beforeSchema);

          schemaTable.addRow('row-1', beforeValue);

          schemaTable.applyPatches([
            getReplacePatch({
              path: '',
              value: afterSchema,
            }),
          ]);

          expect(schemaTable.getRow('row-1')).toEqual(nextValue);
        },
      );

      it('from number to string in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getNumberSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: 100,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getStringSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: '100',
        });
      });

      it('from number to string in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getNumberSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: [1, 2, 3],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getStringSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: ['1', '2', '3'],
        });
      });

      it('from string to number in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getStringSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: '100',
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getNumberSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: 100,
        });
      });

      it('from string to number in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getStringSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: ['1', '2', '3', 'value', '', '1123213123ggdfg0'],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getNumberSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: [1, 2, 3, 0, 0, 1123213123],
        });
      });

      it('from string to string with fields in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getStringSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: '### title',
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getStringSchema({
              contentMediaType: 'text/markdown',
            }),
          }),
        ]);

        const expectedSchema = getObjectSchema({
          field: getStringSchema({
            contentMediaType: 'text/markdown',
          }),
        });

        expect(schemaTable.getSchema()).toStrictEqual(expectedSchema);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: '### title',
        });
      });

      it('from string to string with fields in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getStringSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: ['1', '2', '3', 'value', '', '1123213123ggdfg0'],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getStringSchema({
              contentMediaType: 'text/markdown',
            }),
          }),
        ]);

        const expectedSchema = getObjectSchema({
          field: getArraySchema(
            getStringSchema({
              contentMediaType: 'text/markdown',
            }),
          ),
        });

        expect(schemaTable.getSchema()).toStrictEqual(expectedSchema);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: ['1', '2', '3', 'value', '', '1123213123ggdfg0'],
        });
      });

      it('from boolean to string in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getBooleanSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: true,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getStringSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: 'true',
        });
      });

      it('from boolean to string in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getBooleanSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: [true, false, true],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getStringSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: ['true', 'false', 'true'],
        });
      });

      it('from string to boolean in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getStringSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: 'False',
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getBooleanSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: false,
        });
      });

      it('from string to boolean in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getStringSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: ['true', 'false', 'False', '', '0', '1'],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getBooleanSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: [true, false, false, false, true, true],
        });
      });

      it('from boolean to number in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getBooleanSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: true,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getNumberSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: 1,
        });
      });

      it('from boolean to number in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getBooleanSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: [true, false, true, false, true],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getNumberSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: [1, 0, 1, 0, 1],
        });
      });

      it('from number to boolean in object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getNumberSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: 1,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getBooleanSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: true,
        });
      });

      it('from number to boolean in array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getNumberSchema()),
          }),
        );

        schemaTable.addRow('row-1', {
          field: [1, 123, 0, 0.01, 12],
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field/items',
            value: getBooleanSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: [true, true, false, true, true],
        });
      });
    });
  });

  describe('remove', () => {
    it('remove from nested object', () => {
      const removeNestedPatchObject = getRemovePatch({
        path: '/properties/nested/properties/value',
      });

      const schema = getObjectSchema({
        fieldString: getStringSchema(),
        fieldArray: getArraySchema(getNumberSchema()),
        nested: getObjectSchema({ value: getNumberSchema() }),
      });

      const expectedSchema = getObjectSchema({
        fieldString: getStringSchema(),
        fieldArray: getArraySchema(getNumberSchema()),
        nested: getObjectSchema({}),
      });

      expect(applyPatches(schema, [removeNestedPatchObject])).toStrictEqual(
        expectedSchema,
      );
    });

    it('remove from nested array', () => {
      const removeNestedPatchArray = getRemovePatch({
        path: '/properties/fieldArray/items',
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(getNumberSchema()),
      });

      expect(() => applyPatches(schema, [removeNestedPatchArray])).toThrow(
        'Cannot remove from non-object',
      );
    });

    it('remove from items / items', () => {
      const removeNestedPatchArray = getRemovePatch({
        path: '/properties/fieldArray/items/items',
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(getArraySchema(getNumberSchema())),
      });

      expect(() => applyPatches(schema, [removeNestedPatchArray])).toThrow(
        'Cannot remove from non-object',
      );
    });

    it('remove from items / items / properties', () => {
      const removeNestedPatchArray = getRemovePatch({
        path: '/properties/fieldArray/items/items/properties/field',
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(
          getArraySchema(getObjectSchema({ field: getNumberSchema() })),
        ),
      });

      const expectedSchema = getObjectSchema({
        fieldArray: getArraySchema(getArraySchema(getObjectSchema({}))),
      });

      expect(applyPatches(schema, [removeNestedPatchArray])).toStrictEqual(
        expectedSchema,
      );
    });

    it('remove from root', () => {
      const removeNestedPatchArray = getRemovePatch({
        path: '',
      });

      const schema = getObjectSchema({
        fieldArray: getArraySchema(getNumberSchema()),
      });

      expect(() => applyPatches(schema, [removeNestedPatchArray])).toThrow(
        'Parent does not exist',
      );
    });
  });

  describe('add', () => {
    it('invalid path', () => {
      const addNestedPatchField = getAddPatch({
        path: '',
        value: getObjectSchema({ subSubField: getStringSchema() }),
      });

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getNumberSchema() }),
      });

      expect(() => applyPatches(schema, [addNestedPatchField])).toThrow(
        'Invalid path',
      );
    });

    it('invalid type of parent', () => {
      const addNestedPatchField = getAddPatch({
        path: '/properties/field2',
        value: getObjectSchema({ subSubField: getStringSchema() }),
      });

      const schema = getArraySchema(getNumberSchema());

      expect(() => applyPatches(schema, [addNestedPatchField])).toThrow(
        'Cannot add to non-object',
      );
    });

    it('field already exist', () => {
      const addNestedPatchField = getAddPatch({
        path: '/properties/field/properties/subField',
        value: getObjectSchema({ subSubField: getStringSchema() }),
      });

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getNumberSchema() }),
      });

      expect(() => applyPatches(schema, [addNestedPatchField])).toThrow(
        'Field "subField" already exists in parent',
      );
    });

    it('add to object', () => {
      const addNestedPatchField = getAddPatch({
        path: '/properties/field2',
        value: getObjectSchema({ subSubField: getStringSchema() }),
      });

      const schema = getObjectSchema({
        field: getObjectSchema({
          subField: getNumberSchema(),
        }),
      });

      const expectedSchema = getObjectSchema({
        field: getObjectSchema({
          subField: getNumberSchema(),
        }),
        field2: addNestedPatchField.value,
      });

      expect(applyPatches(schema, [addNestedPatchField])).toEqual(
        expectedSchema,
      );
    });

    it('add to nested object', () => {
      const addNestedPatchField = getAddPatch({
        path: '/properties/field/properties/subField2',
        value: getObjectSchema({ subSubField: getBooleanSchema() }),
      });

      const schema = getObjectSchema({
        field: getObjectSchema({
          subField: getNumberSchema(),
        }),
      });

      const expectedSchema = getObjectSchema({
        field: getObjectSchema({
          subField: getNumberSchema(),
          subField2: addNestedPatchField.value,
        }),
      });

      expect(applyPatches(schema, [addNestedPatchField])).toEqual(
        expectedSchema,
      );
    });

    it('add to items / items / object', () => {
      const addNestedPatchField = getAddPatch({
        path: '/properties/field/items/items/properties/subField2',
        value: getObjectSchema({ subSubField: getBooleanSchema() }),
      });

      const schema = getObjectSchema({
        field: getArraySchema(
          getArraySchema(getObjectSchema({ subField: getNumberSchema() })),
        ),
      });

      const expectedSchema = getObjectSchema({
        field: getArraySchema(
          getArraySchema(
            getObjectSchema({
              subField: getNumberSchema(),
              subField2: addNestedPatchField.value,
            }),
          ),
        ),
      });

      expect(applyPatches(schema, [addNestedPatchField])).toEqual(
        expectedSchema,
      );
    });

    it('add to items / properties / items / properties', () => {
      const addNestedPatchField = getAddPatch({
        path: '/items/properties/field/items/properties/subField2',
        value: getObjectSchema({ subSubField: getBooleanSchema() }),
      });

      const schema = getArraySchema(
        getObjectSchema({
          field: getArraySchema(
            getObjectSchema({
              subField: getStringSchema(),
            }),
          ),
        }),
      );

      const expectedSchema = getArraySchema(
        getObjectSchema({
          field: getArraySchema(
            getObjectSchema({
              subField: getStringSchema(),
              subField2: addNestedPatchField.value,
            }),
          ),
        }),
      );

      expect(applyPatches(schema, [addNestedPatchField])).toEqual(
        expectedSchema,
      );
    });

    it('add with ref', () => {
      const addNestedPatchField = getAddPatch({
        path: '/properties/field2',
        value: getObjectSchema({ file: getRefSchema(SystemSchemaIds.File) }),
      });

      const schema = getObjectSchema({
        field: getObjectSchema({
          subField: getNumberSchema(),
        }),
      });

      const expectedSchema = getObjectSchema({
        field: getObjectSchema({
          subField: getNumberSchema(),
        }),
        field2: addNestedPatchField.value,
      });

      expect(
        applyPatches(schema, [addNestedPatchField], {
          [SystemSchemaIds.File]: fileSchema,
        }),
      ).toEqual(expectedSchema);
    });
  });

  describe('move', () => {
    it('invalid from parent', () => {
      const movePatch = getMovePatch({
        from: '/properties/field2/properties/field',
        path: '/properties/field3',
      });

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getNumberSchema() }),
      });

      expect(() => applyPatches(schema, [movePatch])).toThrow(
        'Not found "field2" in "/properties"',
      );
    });

    it('invalid to parent', () => {
      const movePatch = getMovePatch({
        from: '/properties/field/properties/subField',
        path: '/properties/field2/properties/subField',
      });

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getNumberSchema() }),
      });

      expect(() => applyPatches(schema, [movePatch])).toThrow(
        'Not found "field2" in "/properties"',
      );
    });

    it('Invalid type of "from" parent', () => {
      const movePatch = getMovePatch({
        from: '/properties/field/properties/subField',
        path: '/properties/field2',
      });

      const schema = getObjectSchema({
        field: getArraySchema(getNumberSchema()),
      });

      expect(() => applyPatches(schema, [movePatch])).toThrow(
        'Cannot move from non-object parent',
      );
    });

    it('Invalid type of "to" parent', () => {
      const movePatch = getMovePatch({
        from: '/properties/field/properties/subField',
        path: '/properties/fieldString/field',
      });

      const schema = getObjectSchema({
        field: getArraySchema(getNumberSchema()),
        fieldString: getStringSchema(),
      });

      expect(() => applyPatches(schema, [movePatch])).toThrow('Invalid path');
    });

    it('invalid field name', () => {
      const movePatch = getMovePatch({
        from: '/properties/field2',
        path: '/properties/field/properties/123123',
      });

      const moveField = getArraySchema(getStringSchema());

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getStringSchema() }),
        field2: moveField,
      });

      expect(() => applyPatches(schema, [movePatch])).toThrow(
        'Invalid name: 123123. It must contain',
      );
    });

    it('move and replace in object', () => {
      const movePatch = getMovePatch({
        from: '/properties/field2',
        path: '/properties/field/properties/subField',
      });

      const moveField = getArraySchema(getStringSchema());

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getStringSchema() }),
        field2: moveField,
      });

      const expectedSchema = getObjectSchema({
        field: getObjectSchema({ subField: moveField }),
      });

      expect(applyPatches(schema, [movePatch])).toEqual(expectedSchema);
    });

    it('move and add in object', () => {
      const movePatch = getMovePatch({
        from: '/properties/field2',
        path: '/properties/field/properties/subField2',
      });

      const moveField = getArraySchema(getStringSchema());

      const schema = getObjectSchema({
        field: getObjectSchema({ subField: getStringSchema() }),
        field2: moveField,
      });

      const expectedSchema = getObjectSchema({
        field: getObjectSchema({
          subField: getStringSchema(),
          subField2: moveField,
        }),
      });

      expect(applyPatches(schema, [movePatch])).toEqual(expectedSchema);
    });

    it('move and replace items in array', () => {
      const movePatch = getMovePatch({
        from: '/properties/field2',
        path: '/properties/field/properties/subArrayField/items',
      });

      const moveField = getArraySchema(getNumberSchema());

      const schema = getObjectSchema({
        field: getObjectSchema({
          subArrayField: getArraySchema(getStringSchema()),
        }),
        field2: moveField,
      });

      const expectedSchema = getObjectSchema({
        field: getObjectSchema({
          subArrayField: getArraySchema(moveField),
        }),
      });

      expect(applyPatches(schema, [movePatch])).toEqual(expectedSchema);
    });

    it('move and replace items in items / items', () => {
      const movePatch = getMovePatch({
        from: '/properties/field2',
        path: '/properties/field/items/items',
      });

      const moveField = getArraySchema(getNumberSchema());

      const schema = getObjectSchema({
        field: getArraySchema(getArraySchema(getStringSchema())),
        field2: moveField,
      });

      const expectedSchema = getObjectSchema({
        field: getArraySchema(getArraySchema(moveField)),
      });

      expect(applyPatches(schema, [movePatch])).toEqual(expectedSchema);
    });

    it('move from properties / items / items / properties to properties', () => {
      const movePatch = getMovePatch({
        from: '/properties/field/items/items/properties/field',
        path: '/properties/field2',
      });

      const moveField = getArraySchema(getNumberSchema());

      const schema = getObjectSchema({
        field: getArraySchema(
          getArraySchema(getObjectSchema({ field: moveField })),
        ),
      });

      const expectedSchema = getObjectSchema({
        field: getArraySchema(getArraySchema(getObjectSchema({}))),
        field2: moveField,
      });

      expect(applyPatches(schema, [movePatch])).toEqual(expectedSchema);
    });

    it('move with ref', () => {
      const movePatch = getMovePatch({
        from: '/properties/field/items/items/properties/field',
        path: '/properties/field2',
      });

      const moveField = getArraySchema(getRefSchema(SystemSchemaIds.File));

      const schema = getObjectSchema({
        field: getArraySchema(
          getArraySchema(getObjectSchema({ field: moveField })),
        ),
      });

      const expectedSchema = getObjectSchema({
        field: getArraySchema(getArraySchema(getObjectSchema({}))),
        field2: moveField,
      });

      expect(
        applyPatches(schema, [movePatch], {
          [SystemSchemaIds.File]: fileSchema,
        }),
      ).toEqual(expectedSchema);
    });

    describe('values migration', () => {
      it('same parent', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getObjectSchema({
              subArrayField: getArraySchema(getStringSchema()),
            }),
          }),
        );

        schemaTable.addRow('row-1', {
          field: {
            subArrayField: ['1', '2', '3'],
          },
        });

        schemaTable.applyPatches([
          getMovePatch({
            from: '/properties/field',
            path: '/properties/field2',
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field2: {
            subArrayField: ['1', '2', '3'],
          },
        });
      });

      it('same parent and replace', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getObjectSchema({
              subArrayField: getArraySchema(getStringSchema()),
            }),
            field2: getNumberSchema(),
          }),
        );

        schemaTable.addRow('row-1', {
          field: {
            subArrayField: ['1', '2', '3'],
          },
          field2: 10,
        });

        schemaTable.applyPatches([
          getMovePatch({
            from: '/properties/field',
            path: '/properties/field2',
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field2: {
            subArrayField: ['1', '2', '3'],
          },
        });
      });

      it('different parents', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            parent1: getObjectSchema({
              nested: getStringSchema(),
              forReplace: getArraySchema(getNumberSchema()),
            }),
            parent2: getObjectSchema({
              willBeReplaced: getBooleanSchema(),
            }),
          }),
        );

        schemaTable.addRow('row-1', {
          parent1: {
            nested: 'value',
            forReplace: [1, 2, 3],
          },
          parent2: {
            willBeReplaced: 'willBeReplaced',
          },
        });

        schemaTable.applyPatches([
          getMovePatch({
            from: '/properties/parent1/properties/nested',
            path: '/properties/parent2/properties/nested2',
          }),
          getMovePatch({
            from: '/properties/parent1/properties/forReplace',
            path: '/properties/parent2/properties/willBeReplaced',
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          parent1: {},
          parent2: {
            nested2: 'value',
            willBeReplaced: [1, 2, 3],
          },
        });
      });

      it('to array items', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            parent1: getArraySchema(getStringSchema()),
            parent2: getObjectSchema({
              field: getStringSchema(),
            }),
          }),
        );

        schemaTable.addRow('row-1', {
          parent1: ['1', '2', '3', '4', '5'],
          parent2: {
            field: 'field',
          },
        });

        schemaTable.applyPatches([
          getMovePatch({
            from: '/properties/parent2',
            path: '/properties/parent1/items',
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          parent1: [
            {
              field: 'field',
            },
            {
              field: 'field',
            },
            {
              field: 'field',
            },
            {
              field: 'field',
            },
            {
              field: 'field',
            },
          ],
        });
      });

      it('different parents with ref', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            parent1: getObjectSchema({
              nested: getStringSchema(),
              forReplace: getArraySchema(getRefSchema(SystemSchemaIds.File)),
            }),
            parent2: getObjectSchema({
              willBeReplaced: getBooleanSchema(),
            }),
          }),
          { [SystemSchemaIds.File]: fileSchema },
        );

        const files = [
          {
            status: 'ready',
            url: 'url',
            fileName: 'filename1.png',
            hash: 'hash',
            extension: 'png',
            mimeType: 'mimeType',
            size: 1,
            width: 1,
            height: 1,
          },
          {
            status: 'ready',
            url: 'url',
            fileName: 'filename2.png',
            hash: 'hash',
            extension: 'png',
            mimeType: 'mimeType',
            size: 2,
            width: 2,
            height: 2,
          },
        ];

        schemaTable.addRow('row-1', {
          parent1: {
            nested: 'value',
            forReplace: files,
          },
          parent2: {
            willBeReplaced: 'willBeReplaced',
          },
        });

        schemaTable.applyPatches([
          getMovePatch({
            from: '/properties/parent1/properties/nested',
            path: '/properties/parent2/properties/nested2',
          }),
          getMovePatch({
            from: '/properties/parent1/properties/forReplace',
            path: '/properties/parent2/properties/willBeReplaced',
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          parent1: {},
          parent2: {
            nested2: 'value',
            willBeReplaced: files,
          },
        });
      });
    });
  });

  describe('wrap primitives by array', () => {
    it.each([
      [
        getStringSchema(),
        getArraySchema(getStringSchema()),
        'value',
        ['value'],
      ],
      [getStringSchema(), getArraySchema(getNumberSchema()), '100fg', [100]],
      [getStringSchema(), getArraySchema(getBooleanSchema()), 'false', [false]],
      [getNumberSchema(), getArraySchema(getNumberSchema()), 123, [123]],
      [getNumberSchema(), getArraySchema(getStringSchema()), 123, ['123']],
      [getNumberSchema(), getArraySchema(getBooleanSchema()), 123, [true]],
      [getBooleanSchema(), getArraySchema(getStringSchema()), true, ['true']],
      [getBooleanSchema(), getArraySchema(getNumberSchema()), true, [1]],
    ])(
      'wrap primitives by array %#',
      (primitiveSchema, arraySchema, value, arrayValue) => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: primitiveSchema,
          }),
        );

        schemaTable.addRow('row-1', {
          field: value,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: arraySchema,
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: arrayValue,
        });
      },
    );
  });

  describe('unwrap primitives from array', () => {
    it.each([
      [
        getStringSchema(),
        getArraySchema(getStringSchema()),
        'value',
        ['value'],
      ],
      [getStringSchema(), getArraySchema(getNumberSchema()), '100', [100, 200]],
      [
        getStringSchema(),
        getArraySchema(getBooleanSchema()),
        'false',
        [false, true],
      ],
      [
        getNumberSchema(),
        getArraySchema(getNumberSchema()),
        123,
        [123, 223, 312],
      ],
      [getNumberSchema(), getArraySchema(getStringSchema()), 123, ['123', '1']],
      [getNumberSchema(), getArraySchema(getBooleanSchema()), 1, [true, false]],
      [
        getBooleanSchema(),
        getArraySchema(getStringSchema()),
        true,
        ['string', 'true'],
      ],
      [getBooleanSchema(), getArraySchema(getNumberSchema()), true, [1]],
      [getStringSchema(), getArraySchema(getStringSchema()), '', []],
      [getNumberSchema(), getArraySchema(getNumberSchema()), 0, []],
      [getBooleanSchema(), getArraySchema(getBooleanSchema()), false, []],
    ])(
      'unwrap primitives from array %#',
      (primitiveSchema, arraySchema, value, arrayValue) => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: arraySchema,
          }),
        );

        schemaTable.addRow('row-1', {
          field: arrayValue,
        });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: primitiveSchema,
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          field: value,
        });
      },
    );
  });

  describe('sequence', () => {
    it('sequence', () => {
      const schema = getObjectSchema({
        field: getObjectSchema({
          subArrayField: getArraySchema(getStringSchema()),
        }),
        test2: getObjectSchema({}),
        test: getStringSchema(),
        numField: getNumberSchema(),
        booleanField: getBooleanSchema(),
      });

      const expectedSchema = getObjectSchema({
        field2: getObjectSchema({
          subObject: getObjectSchema({
            numField2: getNumberSchema(),
            booleanField2: getBooleanSchema(),
          }),
          subArrayField: getArraySchema(getStringSchema()),
        }),
        test: getNumberSchema(),
      });

      expect(
        applyPatches(schema, [
          getRemovePatch({
            path: '/properties/test2',
          }),
          getAddPatch({
            path: '/properties/field/properties/subObject',
            value: getObjectSchema({}),
          }),
          getReplacePatch({
            path: '/properties/test',
            value: getNumberSchema(),
          }),
          getMovePatch({
            from: '/properties/numField',
            path: '/properties/field/properties/subObject/properties/numField2',
          }),
          getMovePatch({
            from: '/properties/booleanField',
            path: '/properties/field/properties/subObject/properties/booleanField2',
          }),
          getMovePatch({
            from: '/properties/field',
            path: '/properties/field2',
          }),
        ]),
      ).toEqual(expectedSchema);
    });
  });

  describe('validation errors', () => {
    describe('move errors', () => {
      it('throws on move to invalid field name', () => {
        const schema = getObjectSchema({
          field: getStringSchema(),
        });

        expect(() =>
          applyPatches(schema, [
            getMovePatch({
              from: '/properties/field',
              path: '/properties/123invalid',
            }),
          ]),
        ).toThrow('Invalid name: 123invalid');
      });

      it('throws on move from non-existent field', () => {
        const schema = getObjectSchema({
          field: getStringSchema(),
        });

        expect(() =>
          applyPatches(schema, [
            getMovePatch({
              from: '/properties/nonExistent',
              path: '/properties/target',
            }),
          ]),
        ).toThrow('Not found "nonExistent"');
      });

      it('throws on move to non-existent parent', () => {
        const schema = getObjectSchema({
          field: getStringSchema(),
        });

        expect(() =>
          applyPatches(schema, [
            getMovePatch({
              from: '/properties/field',
              path: '/properties/parent/properties/target',
            }),
          ]),
        ).toThrow('Not found "parent"');
      });

      it('throws on move from non-object parent', () => {
        const schema = getObjectSchema({
          field: getArraySchema(getStringSchema()),
        });

        expect(() =>
          applyPatches(schema, [
            getMovePatch({
              from: '/properties/field/items',
              path: '/properties/target',
            }),
          ]),
        ).toThrow('Cannot move from non-object parent');
      });
    });

    describe('add errors', () => {
      it('throws on add to non-object parent', () => {
        const schema = getArraySchema(getStringSchema());

        expect(() =>
          applyPatches(schema, [
            getAddPatch({
              path: '/properties/field',
              value: getStringSchema(),
            }),
          ]),
        ).toThrow('Cannot add to non-object');
      });

      it('throws on add existing field', () => {
        const schema = getObjectSchema({
          existing: getStringSchema(),
        });

        expect(() =>
          applyPatches(schema, [
            getAddPatch({
              path: '/properties/existing',
              value: getNumberSchema(),
            }),
          ]),
        ).toThrow('Field "existing" already exists in parent');
      });

      it('throws on add with invalid path', () => {
        const schema = getObjectSchema({
          field: getStringSchema(),
        });

        expect(() =>
          applyPatches(schema, [
            getAddPatch({
              path: '',
              value: getNumberSchema(),
            }),
          ]),
        ).toThrow('Invalid path');
      });
    });

    describe('remove errors', () => {
      it('throws on remove from non-object', () => {
        const schema = getArraySchema(getStringSchema());

        expect(() =>
          applyPatches(schema, [
            getRemovePatch({
              path: '/items',
            }),
          ]),
        ).toThrow('Cannot remove from non-object');
      });

      it('throws on remove root', () => {
        const schema = getObjectSchema({
          field: getStringSchema(),
        });

        expect(() =>
          applyPatches(schema, [
            getRemovePatch({
              path: '',
            }),
          ]),
        ).toThrow('Parent does not exist');
      });

      it('throws on remove non-existent field', () => {
        const schema = getObjectSchema({
          field: getStringSchema(),
        });

        expect(() =>
          applyPatches(schema, [
            getRemovePatch({
              path: '/properties/nonExistent',
            }),
          ]),
        ).toThrow('Not found "nonExistent"');
      });
    });
  });

  describe('edge cases', () => {
    describe('move chain', () => {
      it('sequential moves a→b→c with data', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            a: getStringSchema(),
            x: getNumberSchema(),
          }),
        );

        schemaTable.addRow('row-1', { a: 'value-a', x: 100 });

        schemaTable.applyPatches([
          getMovePatch({ from: '/properties/a', path: '/properties/b' }),
          getMovePatch({ from: '/properties/b', path: '/properties/c' }),
        ]);

        expect(schemaTable.getSchema()).toStrictEqual(
          getObjectSchema({
            c: getStringSchema(),
            x: getNumberSchema(),
          }),
        );

        expect(schemaTable.getRow('row-1')).toEqual({ c: 'value-a', x: 100 });
      });

      it('three-way move a→b→c→d', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            a: getStringSchema(),
            x: getNumberSchema(),
          }),
        );

        schemaTable.addRow('row-1', { a: 'test', x: 42 });

        schemaTable.applyPatches([
          getMovePatch({ from: '/properties/a', path: '/properties/b' }),
          getMovePatch({ from: '/properties/b', path: '/properties/c' }),
          getMovePatch({ from: '/properties/c', path: '/properties/d' }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({ d: 'test', x: 42 });
      });
    });

    describe('move swap', () => {
      it('swap two fields via temp', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            a: getStringSchema(),
            b: getNumberSchema(),
          }),
        );

        schemaTable.addRow('row-1', { a: 'alpha', b: 123 });

        schemaTable.applyPatches([
          getMovePatch({ from: '/properties/a', path: '/properties/temp' }),
          getMovePatch({ from: '/properties/b', path: '/properties/a' }),
          getMovePatch({ from: '/properties/temp', path: '/properties/b' }),
        ]);

        expect(schemaTable.getSchema()).toStrictEqual(
          getObjectSchema({
            a: getNumberSchema(),
            b: getStringSchema(),
          }),
        );

        expect(schemaTable.getRow('row-1')).toEqual({ a: 123, b: 'alpha' });
      });
    });

    describe('replace root', () => {
      it('array to primitive - takes first element', () => {
        const schemaTable = new SchemaTable(getArraySchema(getStringSchema()));

        schemaTable.addRow('row-1', ['first', 'second', 'third']);
        schemaTable.addRow('row-2', ['a', 'b']);
        schemaTable.addRow('row-3', []);

        schemaTable.applyPatches([
          getReplacePatch({ path: '', value: getStringSchema() }),
        ]);

        expect(schemaTable.getSchema()).toStrictEqual(getStringSchema());
        expect(schemaTable.getRow('row-1')).toEqual('first');
        expect(schemaTable.getRow('row-2')).toEqual('a');
        expect(schemaTable.getRow('row-3')).toEqual('');
      });

      it('array of numbers to primitive', () => {
        const schemaTable = new SchemaTable(getArraySchema(getNumberSchema()));

        schemaTable.addRow('row-1', [100, 200, 300]);
        schemaTable.addRow('row-2', []);

        schemaTable.applyPatches([
          getReplacePatch({ path: '', value: getNumberSchema() }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual(100);
        expect(schemaTable.getRow('row-2')).toEqual(0);
      });

      it('object to string - converts to empty string', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            name: getStringSchema(),
            value: getNumberSchema(),
          }),
        );

        schemaTable.addRow('row-1', { name: 'test', value: 123 });

        schemaTable.applyPatches([
          getReplacePatch({ path: '', value: getStringSchema() }),
        ]);

        expect(schemaTable.getSchema()).toStrictEqual(getStringSchema());
        expect(schemaTable.getRow('row-1')).toEqual('');
      });

      it('object to number - converts to 0', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            id: getNumberSchema(),
            active: getBooleanSchema(),
          }),
        );

        schemaTable.addRow('row-1', { id: 100, active: true });

        schemaTable.applyPatches([
          getReplacePatch({ path: '', value: getNumberSchema() }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual(0);
      });

      it('object to boolean - converts to false', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            enabled: getBooleanSchema(),
          }),
        );

        schemaTable.addRow('row-1', { enabled: true });

        schemaTable.applyPatches([
          getReplacePatch({ path: '', value: getBooleanSchema() }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual(false);
      });

      it('string to object - creates object with default values', () => {
        const schemaTable = new SchemaTable(getStringSchema());

        schemaTable.addRow('row-1', 'test value');

        schemaTable.applyPatches([
          getReplacePatch({
            path: '',
            value: getObjectSchema({
              name: getStringSchema(),
              value: getNumberSchema(),
            }),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({ name: '', value: 0 });
      });

      it('number to object - creates object with default values', () => {
        const schemaTable = new SchemaTable(getNumberSchema());

        schemaTable.addRow('row-1', 123);

        schemaTable.applyPatches([
          getReplacePatch({
            path: '',
            value: getObjectSchema({
              id: getNumberSchema(),
              name: getStringSchema(),
            }),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({ id: 0, name: '' });
      });

      it('boolean to object - creates object with default values', () => {
        const schemaTable = new SchemaTable(getBooleanSchema());

        schemaTable.addRow('row-1', true);

        schemaTable.applyPatches([
          getReplacePatch({
            path: '',
            value: getObjectSchema({
              enabled: getBooleanSchema(),
              count: getNumberSchema(),
            }),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          enabled: false,
          count: 0,
        });
      });

      it('object to array - creates empty array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            items: getArraySchema(getStringSchema()),
          }),
        );

        schemaTable.addRow('row-1', { items: ['a', 'b', 'c'] });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '',
            value: getArraySchema(getStringSchema()),
          }),
        ]);

        expect(schemaTable.getSchema()).toStrictEqual(
          getArraySchema(getStringSchema()),
        );
        expect(schemaTable.getRow('row-1')).toEqual([]);
      });

      it('array to object - creates object with default values', () => {
        const schemaTable = new SchemaTable(getArraySchema(getNumberSchema()));

        schemaTable.addRow('row-1', [1, 2, 3]);

        schemaTable.applyPatches([
          getReplacePatch({
            path: '',
            value: getObjectSchema({
              data: getArraySchema(getNumberSchema()),
            }),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({ data: [] });
      });

      it('array to array with different items type - preserves array structure', () => {
        const schemaTable = new SchemaTable(getArraySchema(getStringSchema()));

        schemaTable.addRow('row-1', ['123', '456', 'abc']);

        schemaTable.applyPatches([
          getReplacePatch({
            path: '',
            value: getArraySchema(getNumberSchema()),
          }),
        ]);

        expect(schemaTable.getSchema()).toStrictEqual(
          getArraySchema(getNumberSchema()),
        );
        expect(schemaTable.getRow('row-1')).toEqual([123, 456, 0]);
      });
    });

    describe('empty structures', () => {
      it('move from empty object', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            source: getObjectSchema({
              field: getStringSchema(),
            }),
            target: getObjectSchema({}),
          }),
        );

        schemaTable.addRow('row-1', { source: {}, target: {} });

        schemaTable.applyPatches([
          getMovePatch({
            from: '/properties/source/properties/field',
            path: '/properties/target/properties/field',
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({
          source: {},
          target: { field: '' },
        });
      });

      it('move from empty array', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            source: getArraySchema(getStringSchema()),
            target: getStringSchema(),
          }),
        );

        schemaTable.addRow('row-1', { source: [], target: 'old' });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/target',
            value: getArraySchema(getStringSchema()),
          }),
          getMovePatch({
            from: '/properties/source',
            path: '/properties/target',
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({ target: [] });
      });

      it('replace with empty array unwraps to default', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getArraySchema(getNumberSchema()),
          }),
        );

        schemaTable.addRow('row-1', { field: [] });
        schemaTable.addRow('row-2', { field: [1, 2, 3] });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getNumberSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({ field: 0 });
        expect(schemaTable.getRow('row-2')).toEqual({ field: 1 });
      });
    });

    describe('non-reversible transformations', () => {
      it('documents data loss in string→number→string', () => {
        const schemaTable = new SchemaTable(
          getObjectSchema({
            field: getStringSchema(),
          }),
        );

        schemaTable.addRow('row-1', { field: 'hello' });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getNumberSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({ field: 0 });

        schemaTable.applyPatches([
          getReplacePatch({
            path: '/properties/field',
            value: getStringSchema(),
          }),
        ]);

        expect(schemaTable.getRow('row-1')).toEqual({ field: '0' });
      });
    });
  });

  describe('x-formula preservation', () => {
    it('preserves x-formula when adding number field with formula', () => {
      const schema = getObjectSchema({
        price: getNumberSchema(),
      });

      const result = applyPatches(schema, [
        getAddPatch({
          path: '/properties/total',
          value: {
            type: 'number',
            default: 0,
            'x-formula': { version: 1, expression: 'price * 2' },
          } as JsonSchemaPrimitives,
        }),
      ]);

      expect(result).toStrictEqual(
        getObjectSchema({
          price: getNumberSchema(),
          total: {
            type: 'number',
            default: 0,
            'x-formula': { version: 1, expression: 'price * 2' },
          } as JsonSchema,
        }),
      );
    });

    it('preserves x-formula when adding boolean field with formula', () => {
      const schema = getObjectSchema({
        count: getNumberSchema(),
      });

      const result = applyPatches(schema, [
        getAddPatch({
          path: '/properties/hasItems',
          value: {
            type: 'boolean',
            default: false,
            'x-formula': { version: 1, expression: 'count > 0' },
          } as JsonSchemaPrimitives,
        }),
      ]);

      expect(result).toStrictEqual(
        getObjectSchema({
          count: getNumberSchema(),
          hasItems: {
            type: 'boolean',
            default: false,
            'x-formula': { version: 1, expression: 'count > 0' },
          } as JsonSchema,
        }),
      );
    });

    it('preserves x-formula when adding string field with formula', () => {
      const schema = getObjectSchema({
        firstName: getStringSchema(),
        lastName: getStringSchema(),
      });

      const result = applyPatches(schema, [
        getAddPatch({
          path: '/properties/fullName',
          value: {
            type: 'string',
            default: '',
            'x-formula': {
              version: 1,
              expression: 'firstName + " " + lastName',
            },
          } as JsonSchemaPrimitives,
        }),
      ]);

      expect(result).toStrictEqual(
        getObjectSchema({
          firstName: getStringSchema(),
          lastName: getStringSchema(),
          fullName: {
            type: 'string',
            default: '',
            'x-formula': {
              version: 1,
              expression: 'firstName + " " + lastName',
            },
          } as JsonSchema,
        }),
      );
    });

    it('preserves x-formula when moving field with formula', () => {
      const schemaTable = new SchemaTable(
        getObjectSchema({
          source: getObjectSchema({
            computed: {
              type: 'number',
              default: 0,
              'x-formula': { version: 1, expression: 'a + b' },
            } as JsonSchemaPrimitives,
          }),
          target: getObjectSchema({}),
        }),
      );

      schemaTable.applyPatches([
        getMovePatch({
          from: '/properties/source/properties/computed',
          path: '/properties/target/properties/computed',
        }),
      ]);

      expect(schemaTable.getSchema()).toStrictEqual(
        getObjectSchema({
          source: getObjectSchema({}),
          target: getObjectSchema({
            computed: {
              type: 'number',
              default: 0,
              'x-formula': { version: 1, expression: 'a + b' },
            } as JsonSchema,
          }),
        }),
      );
    });

    it('does not include x-formula when field has no formula', () => {
      const schema = getObjectSchema({
        value: getNumberSchema(),
      });

      const result = applyPatches(schema, [
        getAddPatch({
          path: '/properties/other',
          value: getNumberSchema(),
        }),
      ]);

      const resultSchema = result as { properties: Record<string, unknown> };
      expect(resultSchema.properties['other']).not.toHaveProperty('x-formula');
    });
  });
});

const applyPatches = (
  schema: JsonSchema,
  patches: JsonPatch[],
  refs: Record<string, JsonSchema> = {},
): JsonSchema => {
  const schemaTable = new SchemaTable(schema, refs);
  schemaTable.applyPatches(patches);
  return schemaTable.getSchema();
};
