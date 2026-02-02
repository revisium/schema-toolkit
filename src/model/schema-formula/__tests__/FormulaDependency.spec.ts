import { ResolvedDependency } from '../core/index.js';

describe('ResolvedDependency', () => {
  describe('construction', () => {
    it('creates dependency with nodeId', () => {
      const dep = new ResolvedDependency('node-1');

      expect(dep.targetNodeId()).toBe('node-1');
    });

    it('throws error for empty nodeId', () => {
      expect(() => new ResolvedDependency('')).toThrow(
        'ResolvedDependency requires a non-empty nodeId',
      );
    });
  });

  describe('targetNodeId', () => {
    it('returns the nodeId', () => {
      const dep = new ResolvedDependency('node-abc');
      expect(dep.targetNodeId()).toBe('node-abc');
    });
  });
});
