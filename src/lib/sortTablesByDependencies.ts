interface TableDependency {
  tableId: string;
  dependsOn: string[];
}

export interface SortTablesByDependenciesResult {
  sortedTables: string[];
  circularDependencies: string[][];
  warnings: string[];
}

/**
 * Sorts tables by foreign key dependencies using Kahn's algorithm.
 * Tables with no dependencies come first, then tables that depend on them.
 * Handles circular dependencies gracefully by appending them at the end with warnings.
 *
 * @param tableSchemas - Record of tableId -> JSON Schema (plain object, not JsonSchemaStore)
 */
export function sortTablesByDependencies(
  tableSchemas: Record<string, object>,
): SortTablesByDependenciesResult {
  const dependencies = extractDependencies(tableSchemas);
  const circularDependencies = detectCircularDependencies(dependencies);
  const sortedTables = topologicalSort(dependencies, circularDependencies);
  const warnings = generateWarnings(circularDependencies);

  return { sortedTables, circularDependencies, warnings };
}

function extractDependencies(
  tableSchemas: Record<string, object>,
): TableDependency[] {
  const tableIds = new Set(Object.keys(tableSchemas));
  const dependencies: TableDependency[] = [];

  for (const [tableId, schema] of Object.entries(tableSchemas)) {
    const foreignKeys = findForeignKeyReferences(schema);
    // Filter: remove self-references and references to tables not in the input
    const dependsOn = foreignKeys.filter(
      (fk) => fk !== tableId && tableIds.has(fk),
    );
    dependencies.push({ tableId, dependsOn });
  }

  return dependencies;
}

function findForeignKeyReferences(schema: object | null): string[] {
  const foreignKeys = new Set<string>();

  if (schema === null || typeof schema !== 'object') {
    return [];
  }

  const record = schema as Record<string, unknown>;

  if (typeof record.foreignKey === 'string') {
    foreignKeys.add(record.foreignKey);
  }

  if (record.properties && typeof record.properties === 'object') {
    for (const property of Object.values(
      record.properties as Record<string, object>,
    )) {
      for (const fk of findForeignKeyReferences(property)) {
        foreignKeys.add(fk);
      }
    }
  }

  if (record.items && typeof record.items === 'object') {
    for (const fk of findForeignKeyReferences(record.items as object)) {
      foreignKeys.add(fk);
    }
  }

  return [...foreignKeys];
}

function detectCircularDependencies(
  dependencies: TableDependency[],
): string[][] {
  const circularDependencies: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const dependencyMap = new Map<string, string[]>();

  for (const dep of dependencies) {
    dependencyMap.set(dep.tableId, dep.dependsOn);
  }

  const dfs = (tableId: string, path: string[]): void => {
    if (recursionStack.has(tableId)) {
      const cycleStart = path.indexOf(tableId);
      const cycle = path.slice(cycleStart);
      cycle.push(tableId);
      circularDependencies.push(cycle);
      return;
    }

    if (visited.has(tableId)) {
      return;
    }

    visited.add(tableId);
    recursionStack.add(tableId);
    path.push(tableId);

    const deps = dependencyMap.get(tableId) || [];
    for (const dep of deps) {
      if (dependencyMap.has(dep)) {
        dfs(dep, [...path]);
      }
    }

    recursionStack.delete(tableId);
  };

  for (const dep of dependencies) {
    if (!visited.has(dep.tableId)) {
      dfs(dep.tableId, []);
    }
  }

  return circularDependencies;
}

function topologicalSort(
  dependencies: TableDependency[],
  circularDependencies: string[][],
): string[] {
  const circularTables = new Set<string>();
  for (const cycle of circularDependencies) {
    for (const table of cycle) {
      circularTables.add(table);
    }
  }

  const dependencyMap = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const dep of dependencies) {
    dependencyMap.set(dep.tableId, dep.dependsOn);
    inDegree.set(dep.tableId, 0);
  }

  for (const dep of dependencies) {
    for (const target of dep.dependsOn) {
      if (!inDegree.has(target)) continue;
      if (circularTables.has(dep.tableId) && circularTables.has(target))
        continue;
      inDegree.set(dep.tableId, (inDegree.get(dep.tableId) ?? 0) + 1);
    }
  }

  // Kahn's algorithm
  const result: string[] = [];
  const queue: string[] = [];

  for (const [tableId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(tableId);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    for (const [tableId, deps] of dependencyMap.entries()) {
      if (!deps.includes(current)) continue;
      if (!inDegree.has(tableId)) continue;
      if (circularTables.has(current) && circularTables.has(tableId)) continue;

      const newDegree = (inDegree.get(tableId) ?? 0) - 1;
      inDegree.set(tableId, newDegree);

      if (newDegree === 0) {
        queue.push(tableId);
      }
    }
  }

  // Append circular tables that weren't already added
  for (const tableId of circularTables) {
    if (!result.includes(tableId)) {
      result.push(tableId);
    }
  }

  return result;
}

function generateWarnings(circularDependencies: string[][]): string[] {
  const warnings: string[] = [];

  for (const cycle of circularDependencies) {
    warnings.push(
      `Circular dependency detected: ${cycle.join(' -> ')}. Creation order may cause foreign key constraint errors.`,
    );
  }

  if (circularDependencies.length > 0) {
    warnings.push(
      'Consider breaking circular dependencies or creating data in multiple passes.',
    );
  }

  return warnings;
}
