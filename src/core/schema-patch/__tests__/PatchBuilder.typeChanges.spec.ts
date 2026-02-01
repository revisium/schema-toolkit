import { describe, it, expect } from '@jest/globals';
import {
  builder,
  treePair,
  objRoot,
  obj,
  arr,
  str,
} from './test-helpers.js';

describe('PatchBuilder type changes', () => {
  it('primitive to object', () => {
    const { base, current } = treePair(
      objRoot([str('field', { id: 'old-field' })]),
      objRoot([obj('field', [str('nested')], { id: 'new-field' })]),
    );

    current.trackReplacement('old-field', 'new-field');

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('primitive to array', () => {
    const { base, current } = treePair(
      objRoot([str('field', { id: 'old-field' })]),
      objRoot([arr('field', str('', { id: 'items-id' }), { id: 'new-field' })]),
    );

    current.trackReplacement('old-field', 'new-field');

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('object to primitive', () => {
    const { base, current } = treePair(
      objRoot([obj('field', [str('nested')], { id: 'old-field' })]),
      objRoot([str('field', { id: 'new-field' })]),
    );

    current.trackReplacement('old-field', 'new-field');

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });

  it('object to array', () => {
    const { base, current } = treePair(
      objRoot([obj('field', [str('nested')], { id: 'old-field' })]),
      objRoot([arr('field', str('', { id: 'items-id' }), { id: 'new-field' })]),
    );

    current.trackReplacement('old-field', 'new-field');

    const patches = builder.build(current, base);

    expect(patches).toMatchSnapshot();
  });
});
