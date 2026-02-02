import { FormulaError } from '../core/index.js';

describe('FormulaError', () => {
  describe('construction', () => {
    it('creates error with message and nodeId', () => {
      const error = new FormulaError('Test error', 'node-1');

      expect(error.message).toBe('Test error');
      expect(error.nodeId).toBe('node-1');
      expect(error.name).toBe('FormulaError');
    });

    it('creates error with details', () => {
      const error = new FormulaError('Test error', 'node-1', 'Some details');

      expect(error.details).toBe('Some details');
    });

    it('returns undefined for missing details', () => {
      const error = new FormulaError('Test error', 'node-1');

      expect(error.details).toBeUndefined();
    });
  });

  describe('inheritance', () => {
    it('is instance of Error', () => {
      const error = new FormulaError('Test', 'node-1');

      expect(error).toBeInstanceOf(Error);
    });

    it('can be caught as Error', () => {
      expect(() => {
        throw new FormulaError('Test', 'node-1');
      }).toThrow(Error);
    });

    it('can be caught by name', () => {
      try {
        throw new FormulaError('Test', 'node-1');
      } catch (e) {
        expect((e as Error).name).toBe('FormulaError');
      }
    });
  });
});
