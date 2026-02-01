import { describe, it, expect } from '@jest/globals';
import {
  builder,
  treePair,
  objRoot,
  obj,
  arr,
  str,
} from './test-helpers.js';

describe('PatchBuilder edge cases', () => {
  it('removes parent with children - single remove patch for parent', () => {
    const { base, current } = treePair(
      objRoot([
        obj('parent', [
          str('child1'),
          str('child2'),
          obj('nested', [str('grandchild')]),
        ]),
      ]),
      objRoot([]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('renames parent - children move together, single move patch', () => {
    const { base, current } = treePair(
      objRoot([obj('oldParent', [str('child1'), str('child2')], { id: 'parent-id' })]),
      objRoot([obj('newParent', [str('child1'), str('child2')], { id: 'parent-id' })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('rename + modify generates move then replace', () => {
    const { base, current } = treePair(
      objRoot([str('oldName', { id: 'field-id', default: 'initial' })]),
      objRoot([str('newName', { id: 'field-id', default: 'modified' })]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });
});

describe('PatchBuilder patch ordering', () => {
  it('move patches come before add/remove', () => {
    const { base, current } = treePair(
      objRoot([str('fieldA', { id: 'fieldA-id' }), str('fieldB')]),
      objRoot([str('renamedA', { id: 'fieldA-id' }), str('newField')]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('add then remove same path in sequence - net effect is no change', () => {
    const { base, current } = treePair(
      objRoot([str('existing')]),
      objRoot([str('existing')]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('multiple renames in sequence', () => {
    const { base, current } = treePair(
      objRoot([
        str('a', { id: 'a-id' }),
        str('b', { id: 'b-id' }),
        str('c', { id: 'c-id' }),
      ]),
      objRoot([
        str('x', { id: 'a-id' }),
        str('y', { id: 'b-id' }),
        str('z', { id: 'c-id' }),
      ]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('array items rename with nested modifications', () => {
    const { base, current } = treePair(
      objRoot([
        arr('items', obj('', [str('oldField', { id: 'field-id', default: 'original' })], { id: 'items-id' })),
      ]),
      objRoot([
        arr('items', obj('', [str('newField', { id: 'field-id', default: 'modified' })], { id: 'items-id' })),
      ]),
    );

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });
});
