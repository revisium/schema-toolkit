import { describe, it, expect } from '@jest/globals';
import { isValidFieldName } from '../schema/FieldNameValidator.js';

describe('FieldNameValidator', () => {
  describe('isValidFieldName', () => {
    describe('valid names', () => {
      it('accepts name starting with letter', () => {
        expect(isValidFieldName('name')).toBe(true);
      });

      it('accepts name starting with underscore', () => {
        expect(isValidFieldName('_name')).toBe(true);
      });

      it('accepts name with numbers', () => {
        expect(isValidFieldName('field1')).toBe(true);
      });

      it('accepts name with hyphens', () => {
        expect(isValidFieldName('my-field')).toBe(true);
      });

      it('accepts name with underscores', () => {
        expect(isValidFieldName('my_field')).toBe(true);
      });

      it('accepts single character name', () => {
        expect(isValidFieldName('a')).toBe(true);
      });

      it('accepts single underscore', () => {
        expect(isValidFieldName('_')).toBe(true);
      });

      it('accepts mixed case', () => {
        expect(isValidFieldName('MyFieldName')).toBe(true);
      });

      it('accepts name with all allowed characters', () => {
        expect(isValidFieldName('My_Field-Name123')).toBe(true);
      });
    });

    describe('invalid names', () => {
      it('rejects empty string', () => {
        expect(isValidFieldName('')).toBe(false);
      });

      it('rejects name starting with double underscore', () => {
        expect(isValidFieldName('__name')).toBe(false);
      });

      it('rejects name starting with number', () => {
        expect(isValidFieldName('1field')).toBe(false);
      });

      it('rejects name starting with hyphen', () => {
        expect(isValidFieldName('-field')).toBe(false);
      });

      it('rejects name with spaces', () => {
        expect(isValidFieldName('my field')).toBe(false);
      });

      it('rejects name with special characters', () => {
        expect(isValidFieldName('field@name')).toBe(false);
        expect(isValidFieldName('field.name')).toBe(false);
        expect(isValidFieldName('field$name')).toBe(false);
      });

      it('rejects name exceeding max length', () => {
        const longName = 'a'.repeat(65);
        expect(isValidFieldName(longName)).toBe(false);
      });

      it('accepts name at max length', () => {
        const maxLengthName = 'a'.repeat(64);
        expect(isValidFieldName(maxLengthName)).toBe(true);
      });

      it('rejects just double underscore', () => {
        expect(isValidFieldName('__')).toBe(false);
      });
    });
  });
});
