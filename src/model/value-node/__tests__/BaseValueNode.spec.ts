import { StringValueNode, resetNodeIdCounter } from '../index.js';
import { str } from '../../../mocks/schema.mocks.js';

beforeEach(() => {
  resetNodeIdCounter();
});

describe('BaseValueNode', () => {
  describe('parent', () => {
    it('parent is null by default', () => {
      const node = new StringValueNode(undefined, 'name', str(), 'John');

      expect(node.parent).toBeNull();
    });

    it('parent can be set and read', () => {
      const parent = new StringValueNode(undefined, 'parent', str(), 'Parent');
      const child = new StringValueNode(undefined, 'child', str(), 'Child');

      child.parent = parent;

      expect(child.parent).toBe(parent);
    });
  });

  describe('errors and warnings defaults', () => {
    it('errors is empty by default', () => {
      const node = new StringValueNode(undefined, 'name', str(), 'John');

      expect(node.errors).toHaveLength(0);
    });

    it('warnings is empty by default', () => {
      const node = new StringValueNode(undefined, 'name', str(), 'John');

      expect(node.warnings).toHaveLength(0);
    });

    it('isValid is true by default', () => {
      const node = new StringValueNode(undefined, 'name', str(), 'John');

      expect(node.isValid).toBe(true);
    });

    it('hasWarnings is false by default', () => {
      const node = new StringValueNode(undefined, 'name', str(), 'John');

      expect(node.hasWarnings).toBe(false);
    });
  });

  describe('schema', () => {
    it('returns schema passed to constructor', () => {
      const schema = str({ default: 'test' });
      const node = new StringValueNode(undefined, 'name', schema);

      expect(node.schema).toBe(schema);
    });
  });
});
