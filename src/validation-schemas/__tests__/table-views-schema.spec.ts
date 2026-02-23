import { RevisiumValidator } from '../../lib/createRevisiumValidator.js';

describe('table-views-schema', () => {
  let validator: RevisiumValidator;

  beforeAll(() => {
    validator = new RevisiumValidator();
  });

  it('validates minimal views data', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default' }],
    };

    expect(validator.validateTableViews(data)).toBe(true);
    expect(validator.validateTableViews.errors).toBeNull();
  });

  it('validates views with all optional fields', () => {
    const data = {
      version: 1,
      defaultViewId: 'published',
      views: [
        {
          id: 'default',
          name: 'Default',
          description: 'Default view',
          columns: [
            { field: 'id', width: 150 },
            { field: 'data.title', width: 300 },
          ],
          filters: {
            logic: 'and',
            conditions: [
              { field: 'data.status', operator: 'equals', value: 'active' },
            ],
            groups: [
              {
                logic: 'or',
                conditions: [
                  { field: 'data.type', operator: 'equals', value: 'post' },
                  { field: 'data.type', operator: 'equals', value: 'article' },
                ],
              },
            ],
          },
          sorts: [{ field: 'data.createdAt', direction: 'desc' }],
          search: 'test query',
        },
        {
          id: 'published',
          name: 'Published Only',
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(true);
    expect(validator.validateTableViews.errors).toBeNull();
  });

  it('validates views with null columns', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default', columns: null }],
    };

    expect(validator.validateTableViews(data)).toBe(true);
    expect(validator.validateTableViews.errors).toBeNull();
  });

  it('validates views with empty columns array', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default', columns: [] }],
    };

    expect(validator.validateTableViews(data)).toBe(true);
    expect(validator.validateTableViews.errors).toBeNull();
  });

  it('validates column without width', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: 'id' }],
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(true);
    expect(validator.validateTableViews.errors).toBeNull();
  });

  it('validates all filter operators', () => {
    const operators = [
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'starts_with',
      'ends_with',
      'is_empty',
      'is_not_empty',
      'gt',
      'gte',
      'lt',
      'lte',
      'is_true',
      'is_false',
    ];

    for (const operator of operators) {
      const data = {
        version: 1,
        defaultViewId: 'default',
        views: [
          {
            id: 'default',
            name: 'Default',
            filters: {
              logic: 'and',
              conditions: [{ field: 'data.test', operator, value: 'test' }],
            },
          },
        ],
      };

      expect(validator.validateTableViews(data)).toBe(true);
      expect(validator.validateTableViews.errors).toBeNull();
    }
  });

  it('validates filter condition without value', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'and',
            conditions: [{ field: 'data.test', operator: 'is_empty' }],
          },
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(true);
    expect(validator.validateTableViews.errors).toBeNull();
  });

  it('rejects invalid version type', () => {
    const data = {
      version: 'not-a-number',
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default' }],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects version less than 1', () => {
    const data = {
      version: 0,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default' }],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects view with empty id', () => {
    const data = {
      version: 1,
      defaultViewId: '',
      views: [{ id: '', name: 'Default' }],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects view with empty name', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: '' }],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects view name exceeding max length', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'a'.repeat(101) }],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects view description exceeding max length', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default', description: 'a'.repeat(501) }],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects column with empty field', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: '' }],
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('validates column with pinned left', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: 'id', pinned: 'left' }],
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(true);
    expect(validator.validateTableViews.errors).toBeNull();
  });

  it('validates column with pinned right', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: 'id', pinned: 'right' }],
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(true);
    expect(validator.validateTableViews.errors).toBeNull();
  });

  it('validates column with width and pinned', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: 'id', width: 150, pinned: 'left' }],
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(true);
    expect(validator.validateTableViews.errors).toBeNull();
  });

  it('rejects invalid pinned value', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: 'id', pinned: 'center' }],
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects column width less than minimum', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: 'id', width: 10 }],
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects invalid sort direction', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          sorts: [{ field: 'id', direction: 'invalid' }],
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects invalid filter logic', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'invalid',
            conditions: [],
          },
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects invalid filter operator', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'and',
            conditions: [{ field: 'id', operator: 'invalid_operator' }],
          },
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects filter condition with empty field', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'and',
            conditions: [{ field: '', operator: 'equals' }],
          },
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects sort with empty field', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          sorts: [{ field: '', direction: 'asc' }],
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects missing required version field', () => {
    const data = {
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default' }],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects missing required views field', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects view missing required id', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [{ name: 'Default' }],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects view missing required name', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default' }],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects additional properties in root', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default' }],
      extra: 'property',
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects additional properties in view', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [{ id: 'default', name: 'Default', extra: 'property' }],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects additional properties in column', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          columns: [{ field: 'id', extra: 'property' }],
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects additional properties in filter group', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'and',
            conditions: [],
            extra: 'property',
          },
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects additional properties in filter condition', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          filters: {
            logic: 'and',
            conditions: [
              { field: 'id', operator: 'equals', value: 'test', extra: 'prop' },
            ],
          },
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });

  it('rejects additional properties in sort', () => {
    const data = {
      version: 1,
      defaultViewId: 'default',
      views: [
        {
          id: 'default',
          name: 'Default',
          sorts: [{ field: 'id', direction: 'asc', extra: 'property' }],
        },
      ],
    };

    expect(validator.validateTableViews(data)).toBe(false);
    expect(validator.validateTableViews.errors).not.toBeNull();
  });
});
