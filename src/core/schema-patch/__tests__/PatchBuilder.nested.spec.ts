import { describe, it, expect } from '@jest/globals';
import {
  builder,
  treePair,
  objRoot,
  obj,
  str,
  num,
} from './test-helpers.js';

describe('PatchBuilder nested operations', () => {
  it('generates two move patches when parent and child are both renamed', () => {
    const { base, current } = treePair(
      objRoot([
        obj('oldParent', [str('oldChild', { id: 'child-id' })], {
          id: 'parent-id',
        }),
      ]),
      objRoot([
        obj('newParent', [str('newChild', { id: 'child-id' })], {
          id: 'parent-id',
        }),
      ]),
    );

    const patches = builder.build(current, base);

    const movePatches = patches.filter((p) => p.patch.op === 'move');
    const replacePatches = patches.filter((p) => p.patch.op === 'replace');

    expect(movePatches).toHaveLength(2);
    expect(replacePatches).toHaveLength(0);

    expect(patches).toMatchSnapshot();
  });


  it('generates moves and replaces when parent and child are both renamed with description added', () => {
    const { base, current } = treePair(
      objRoot([
        obj('oldParent', [str('oldChild', { id: 'child-id' })], {
          id: 'parent-id',
        }),
      ]),
      objRoot([
        obj(
          'newParent',
          [str('newChild', { id: 'child-id', description: 'child desc' })],
          { id: 'parent-id', description: 'parent desc' },
        ),
      ]),
    );

    const patches = builder.build(current, base);

    const movePatches = patches.filter((p) => p.patch.op === 'move');
    const replacePatches = patches.filter((p) => p.patch.op === 'replace');

    expect(movePatches).toHaveLength(2);
    expect(replacePatches).toHaveLength(2);
    expect(patches).toHaveLength(4);

    expect(patches).toMatchSnapshot();
  });

  it('generates three move patches for deeply nested renames (parent, child, grandchild)', () => {
    const { base, current } = treePair(
      objRoot([
        obj(
          'oldParent',
          [
            obj(
              'oldChild',
              [str('oldGrandchild', { id: 'gc-id' })],
              { id: 'child-id' },
            ),
          ],
          { id: 'parent-id' },
        ),
      ]),
      objRoot([
        obj(
          'newParent',
          [
            obj(
              'newChild',
              [str('newGrandchild', { id: 'gc-id' })],
              { id: 'child-id' },
            ),
          ],
          { id: 'parent-id' },
        ),
      ]),
    );

    const patches = builder.build(current, base);

    const movePatches = patches.filter((p) => p.patch.op === 'move');
    const replacePatches = patches.filter((p) => p.patch.op === 'replace');

    expect(movePatches).toHaveLength(3);
    expect(replacePatches).toHaveLength(0);

    expect(patches).toMatchSnapshot();
  });

  it('generates move and replace when parent renamed and child added', () => {
    const { base, current } = treePair(
      objRoot([
        obj('oldParent', [str('existing')], { id: 'parent-id' }),
      ]),
      objRoot([
        obj('newParent', [str('existing'), str('added')], {
          id: 'parent-id',
        }),
      ]),
    );

    const patches = builder.build(current, base);

    const movePatches = patches.filter((p) => p.patch.op === 'move');
    const replacePatches = patches.filter((p) => p.patch.op === 'replace');

    expect(movePatches).toHaveLength(1);
    expect(replacePatches).toHaveLength(1);

    expect(patches).toMatchSnapshot();
  });

  it('generates move for parent and move for child when sibling stays unchanged', () => {
    const { base, current } = treePair(
      objRoot([
        obj(
          'oldParent',
          [str('oldChild', { id: 'child-id' }), num('stable')],
          { id: 'parent-id' },
        ),
      ]),
      objRoot([
        obj(
          'newParent',
          [str('newChild', { id: 'child-id' }), num('stable')],
          { id: 'parent-id' },
        ),
      ]),
    );

    const patches = builder.build(current, base);

    const movePatches = patches.filter((p) => p.patch.op === 'move');
    const replacePatches = patches.filter((p) => p.patch.op === 'replace');

    expect(movePatches).toHaveLength(2);
    expect(replacePatches).toHaveLength(0);

    expect(patches).toMatchSnapshot();
  });

  it('generates replace patch for nested field modification', () => {
    const { base, current } = treePair(
      objRoot([obj('nested', [num('value', { default: 10 })])]),
      objRoot([obj('nested', [num('value', { default: 20 })])]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('generates move patch for renamed nested field', () => {
    const { base, current } = treePair(
      objRoot([obj('nested', [str('oldName', { id: 'field-id' })])]),
      objRoot([obj('nested', [str('newName', { id: 'field-id' })])]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('generates multiple patches for multiple changes in one object', () => {
    const { base, current } = treePair(
      objRoot([
        obj('nested', [
          str('fieldA', { default: 'a' }),
          str('fieldB', { default: 'b' }),
          str('fieldC', { default: 'c' }),
        ]),
      ]),
      objRoot([
        obj('nested', [
          str('fieldA', { default: 'modified' }),
          str('fieldC', { default: 'c' }),
          str('fieldD'),
        ]),
      ]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });
});
