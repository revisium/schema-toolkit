import { fileSchema } from '../file-schema.js';

describe('fileSchema', () => {
  it('should have correct type', () => {
    expect(fileSchema.type).toBe('object');
  });

  it('should have all required properties', () => {
    expect(fileSchema.properties).toBeDefined();
    expect(Object.keys(fileSchema.properties)).toEqual([
      'status',
      'fileId',
      'url',
      'fileName',
      'hash',
      'extension',
      'mimeType',
      'size',
      'width',
      'height',
    ]);
  });

  it('should have correct required fields', () => {
    expect(fileSchema.required).toEqual([
      'status',
      'fileId',
      'url',
      'fileName',
      'hash',
      'extension',
      'mimeType',
      'size',
      'width',
      'height',
    ]);
  });

  it('should not allow additional properties', () => {
    expect(fileSchema.additionalProperties).toBe(false);
  });

  describe('string properties', () => {
    const readOnlyStringProps = [
      'status',
      'fileId',
      'url',
      'hash',
      'extension',
      'mimeType',
    ];

    readOnlyStringProps.forEach((prop) => {
      it(`should have ${prop} as readOnly string with empty default`, () => {
        expect(fileSchema.properties[prop]).toStrictEqual({
          type: 'string',
          default: '',
          readOnly: true,
        });
      });
    });

    it('should have fileName as writable string with empty default', () => {
      expect(fileSchema.properties.fileName).toStrictEqual({
        type: 'string',
        default: '',
      });
    });
  });

  describe('number properties', () => {
    const numberProps = ['size', 'width', 'height'];

    numberProps.forEach((prop) => {
      it(`should have ${prop} as number with 0 default`, () => {
        expect(fileSchema.properties[prop]).toStrictEqual({
          type: 'number',
          default: 0,
          readOnly: true,
        });
      });
    });
  });

  it('should match expected structure', () => {
    expect(fileSchema).toStrictEqual({
      type: 'object',
      properties: {
        status: {
          type: 'string',
          default: '',
          readOnly: true,
        },
        fileId: {
          type: 'string',
          default: '',
          readOnly: true,
        },
        url: { type: 'string', default: '', readOnly: true },
        fileName: { type: 'string', default: '' },
        hash: {
          type: 'string',
          default: '',
          readOnly: true,
        },
        extension: {
          type: 'string',
          default: '',
          readOnly: true,
        },
        mimeType: {
          type: 'string',
          default: '',
          readOnly: true,
        },
        size: {
          type: 'number',
          default: 0,
          readOnly: true,
        },
        width: {
          type: 'number',
          default: 0,
          readOnly: true,
        },
        height: {
          type: 'number',
          default: 0,
          readOnly: true,
        },
      },
      required: [
        'status',
        'fileId',
        'url',
        'fileName',
        'hash',
        'extension',
        'mimeType',
        'size',
        'width',
        'height',
      ],
      additionalProperties: false,
    });
  });
});
