import { describe, it, expect } from '@jest/globals';
import { createSchemaModel } from '../SchemaModelImpl.js';
import { obj, num } from '../../../mocks/schema.mocks.js';
import { findNodeIdByName } from './test-helpers.js';

describe('SchemaModel add + move patch generation', () => {
  describe('move field into newly created parent', () => {
    it('generates add + move when moving field into new parent', () => {
      const model = createSchemaModel(
        obj({
          value: num(),
          sum: num(),
        }),
      );

      const rootId = model.root.id();
      model.addField(rootId, 'nested', 'object');

      const sumId = findNodeIdByName(model, 'sum');
      const nestedId = findNodeIdByName(model, 'nested');
      model.moveNode(sumId!, nestedId!);

      expect(model.patches).toMatchSnapshot();
    });

    it('generates add + move for multiple fields moved into new parent', () => {
      const model = createSchemaModel(
        obj({
          a: num(),
          b: num(),
          c: num(),
        }),
      );

      const rootId = model.root.id();
      model.addField(rootId, 'group', 'object');

      const aId = findNodeIdByName(model, 'a');
      const bId = findNodeIdByName(model, 'b');
      const groupId = findNodeIdByName(model, 'group');

      model.moveNode(aId!, groupId!);
      model.moveNode(bId!, groupId!);

      expect(model.patches).toMatchSnapshot();
    });
  });
});
