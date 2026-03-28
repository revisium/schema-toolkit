import { sortTablesByDependencies } from '../sortTablesByDependencies.js';

describe('sortTablesByDependencies', () => {
  describe('no dependencies', () => {
    it('returns empty array for empty input', () => {
      const result = sortTablesByDependencies({});
      expect(result.sortedTables).toEqual([]);
      expect(result.circularDependencies).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('returns tables in original order when no FK', () => {
      const result = sortTablesByDependencies({
        users: { type: 'object', properties: { name: { type: 'string' } } },
        posts: { type: 'object', properties: { title: { type: 'string' } } },
      });
      expect(result.sortedTables).toEqual(['users', 'posts']);
      expect(result.circularDependencies).toEqual([]);
    });
  });

  describe('linear dependencies', () => {
    it('sorts parent before child (single FK)', () => {
      const result = sortTablesByDependencies({
        reviews: {
          type: 'object',
          properties: {
            productRef: { type: 'string', foreignKey: 'products' },
          },
        },
        products: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      });
      expect(result.sortedTables).toEqual(['products', 'reviews']);
    });

    it('sorts chain: A -> B -> C', () => {
      const result = sortTablesByDependencies({
        comments: {
          type: 'object',
          properties: {
            postRef: { type: 'string', foreignKey: 'posts' },
          },
        },
        posts: {
          type: 'object',
          properties: {
            authorRef: { type: 'string', foreignKey: 'users' },
          },
        },
        users: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      });
      expect(result.sortedTables).toEqual(['users', 'posts', 'comments']);
    });

    it('handles multiple dependencies from one table', () => {
      const result = sortTablesByDependencies({
        order_items: {
          type: 'object',
          properties: {
            orderRef: { type: 'string', foreignKey: 'orders' },
            productRef: { type: 'string', foreignKey: 'products' },
          },
        },
        orders: {
          type: 'object',
          properties: { total: { type: 'number' } },
        },
        products: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      });
      expect(result.sortedTables.indexOf('orders')).toBeLessThan(
        result.sortedTables.indexOf('order_items'),
      );
      expect(result.sortedTables.indexOf('products')).toBeLessThan(
        result.sortedTables.indexOf('order_items'),
      );
    });
  });

  describe('nested and array FK', () => {
    it('detects FK in nested object properties', () => {
      const result = sortTablesByDependencies({
        reviews: {
          type: 'object',
          properties: {
            meta: {
              type: 'object',
              properties: {
                productRef: { type: 'string', foreignKey: 'products' },
              },
            },
          },
        },
        products: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      });
      expect(result.sortedTables).toEqual(['products', 'reviews']);
    });

    it('detects FK in array items', () => {
      const result = sortTablesByDependencies({
        playlists: {
          type: 'object',
          properties: {
            songs: {
              type: 'array',
              items: { type: 'string', foreignKey: 'songs' },
            },
          },
        },
        songs: {
          type: 'object',
          properties: { title: { type: 'string' } },
        },
      });
      expect(result.sortedTables).toEqual(['songs', 'playlists']);
    });

    it('detects FK in array of objects', () => {
      const result = sortTablesByDependencies({
        invoices: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productRef: { type: 'string', foreignKey: 'products' },
                },
              },
            },
          },
        },
        products: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
      });
      expect(result.sortedTables).toEqual(['products', 'invoices']);
    });
  });

  describe('self-references', () => {
    it('ignores self-referencing FK', () => {
      const result = sortTablesByDependencies({
        categories: {
          type: 'object',
          properties: {
            parentRef: { type: 'string', foreignKey: 'categories' },
            name: { type: 'string' },
          },
        },
      });
      expect(result.sortedTables).toEqual(['categories']);
      expect(result.circularDependencies).toEqual([]);
    });
  });

  describe('external references', () => {
    it('ignores FK pointing to tables not in the input', () => {
      const result = sortTablesByDependencies({
        reviews: {
          type: 'object',
          properties: {
            productRef: { type: 'string', foreignKey: 'products' },
          },
        },
      });
      // products is not in the input, so reviews has no resolvable dependency
      expect(result.sortedTables).toEqual(['reviews']);
      expect(result.circularDependencies).toEqual([]);
    });
  });

  describe('circular dependencies', () => {
    it('detects A <-> B cycle', () => {
      const result = sortTablesByDependencies({
        table_a: {
          type: 'object',
          properties: {
            bRef: { type: 'string', foreignKey: 'table_b' },
          },
        },
        table_b: {
          type: 'object',
          properties: {
            aRef: { type: 'string', foreignKey: 'table_a' },
          },
        },
      });
      expect(result.circularDependencies.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
      // Both tables should still appear in sortedTables
      expect(result.sortedTables).toHaveLength(2);
      expect(result.sortedTables).toContain('table_a');
      expect(result.sortedTables).toContain('table_b');
    });

    it('detects A -> B -> C -> A cycle', () => {
      const result = sortTablesByDependencies({
        a: {
          type: 'object',
          properties: { ref: { type: 'string', foreignKey: 'b' } },
        },
        b: {
          type: 'object',
          properties: { ref: { type: 'string', foreignKey: 'c' } },
        },
        c: {
          type: 'object',
          properties: { ref: { type: 'string', foreignKey: 'a' } },
        },
      });
      expect(result.circularDependencies.length).toBeGreaterThan(0);
      expect(result.sortedTables).toHaveLength(3);
    });

    it('handles mix of cyclic and acyclic tables', () => {
      const result = sortTablesByDependencies({
        independent: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
        cycle_a: {
          type: 'object',
          properties: { ref: { type: 'string', foreignKey: 'cycle_b' } },
        },
        cycle_b: {
          type: 'object',
          properties: { ref: { type: 'string', foreignKey: 'cycle_a' } },
        },
        depends_on_independent: {
          type: 'object',
          properties: {
            ref: { type: 'string', foreignKey: 'independent' },
          },
        },
      });
      // Acyclic tables come first in correct order
      const indIdx = result.sortedTables.indexOf('independent');
      const depIdx = result.sortedTables.indexOf('depends_on_independent');
      expect(indIdx).toBeLessThan(depIdx);
      // All tables present
      expect(result.sortedTables).toHaveLength(4);
      expect(result.circularDependencies.length).toBeGreaterThan(0);
    });
  });

  describe('large graph', () => {
    it('handles 10 tables with chain dependency', () => {
      const schemas: Record<string, object> = {};
      for (let i = 0; i < 10; i++) {
        const tableId = `table_${i}`;
        if (i === 0) {
          schemas[tableId] = {
            type: 'object',
            properties: { name: { type: 'string' } },
          };
        } else {
          schemas[tableId] = {
            type: 'object',
            properties: {
              ref: { type: 'string', foreignKey: `table_${i - 1}` },
            },
          };
        }
      }
      const result = sortTablesByDependencies(schemas);
      // Each table should come after its dependency
      for (let i = 1; i < 10; i++) {
        expect(result.sortedTables.indexOf(`table_${i - 1}`)).toBeLessThan(
          result.sortedTables.indexOf(`table_${i}`),
        );
      }
    });
  });
});
