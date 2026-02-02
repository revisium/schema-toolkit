import type { SchemaNode } from '../schema-node/index.js';
import type { SchemaTree } from '../schema-tree/index.js';
import { jsonPointerToPath } from '../path/index.js';
import type { DefaultValueType, JsonPatch, SchemaPatch } from './types.js';

function isPrimitiveDefault(value: unknown): value is string | number | boolean {
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}

export class PatchEnricher {
  constructor(
    private readonly currentTree: SchemaTree,
    private readonly baseTree: SchemaTree,
  ) {}

  enrich(patch: JsonPatch): SchemaPatch {
    const fieldName = this.getFieldNameFromPath(patch.path);

    if (patch.op === 'add') {
      return this.enrichAddPatch(patch, fieldName);
    }

    if (patch.op === 'remove') {
      return this.enrichRemovePatch(patch, fieldName);
    }

    if (patch.op === 'move') {
      return this.enrichMovePatch(patch, fieldName);
    }

    return this.enrichReplacePatch(patch, fieldName);
  }

  private enrichAddPatch(patch: JsonPatch, fieldName: string): SchemaPatch {
    const currentNode = this.getNodeAtPath(this.currentTree, patch.path);

    if (!currentNode) {
      return { patch, fieldName };
    }

    return {
      patch,
      fieldName,
      ...this.computeAddMetadata(currentNode),
    };
  }

  private enrichRemovePatch(patch: JsonPatch, fieldName: string): SchemaPatch {
    return { patch, fieldName };
  }

  private enrichMovePatch(patch: JsonPatch, fieldName: string): SchemaPatch {
    const fromPath = patch.from || '';
    const isRename = this.isRenameMove(fromPath, patch.path);

    const baseNode = this.getNodeAtPath(this.baseTree, fromPath);
    const currentNode = this.getNodeAtPath(this.currentTree, patch.path);

    const formulaChange = this.computeFormulaChange(baseNode, currentNode);

    return {
      patch,
      fieldName,
      isRename: isRename || undefined,
      formulaChange,
    };
  }

  private enrichReplacePatch(patch: JsonPatch, fieldName: string): SchemaPatch {
    const baseNode = this.getNodeAtPath(this.baseTree, patch.path);
    const currentNode = this.getNodeAtPath(this.currentTree, patch.path);

    const isArrayMetadataPatch = baseNode?.isArray() && currentNode?.isArray();

    return {
      patch,
      fieldName,
      typeChange: this.computeTypeChange(baseNode, currentNode, isArrayMetadataPatch),
      formulaChange: this.computeFormulaChange(baseNode, currentNode),
      defaultChange: isArrayMetadataPatch
        ? undefined
        : this.computeDefaultChange(baseNode, currentNode),
      descriptionChange: this.computeDescriptionChange(baseNode, currentNode),
      deprecatedChange: this.computeDeprecatedChange(baseNode, currentNode),
      foreignKeyChange: this.computeForeignKeyChange(baseNode, currentNode),
    };
  }

  private computeAddMetadata(
    node: SchemaNode,
  ): Partial<SchemaPatch> {
    const result: Partial<SchemaPatch> = {};

    const formula = node.formula();
    if (formula) {
      result.formulaChange = {
        fromFormula: undefined,
        toFormula: formula.expression,
        fromVersion: undefined,
        toVersion: formula.version,
      };
    }

    const defaultValue = node.defaultValue();
    if (defaultValue !== undefined && isPrimitiveDefault(defaultValue)) {
      result.defaultChange = {
        fromDefault: undefined,
        toDefault: defaultValue,
      };
    }

    const meta = node.metadata();
    if (meta.description) {
      result.descriptionChange = {
        fromDescription: undefined,
        toDescription: meta.description,
      };
    }

    if (meta.deprecated) {
      result.deprecatedChange = {
        fromDeprecated: undefined,
        toDeprecated: meta.deprecated,
      };
    }

    const foreignKey = node.foreignKey();
    if (foreignKey) {
      result.foreignKeyChange = {
        fromForeignKey: undefined,
        toForeignKey: foreignKey,
      };
    }

    return result;
  }

  private computeTypeChange(
    baseNode: SchemaNode | null,
    currentNode: SchemaNode | null,
    ignoreItems?: boolean,
  ): SchemaPatch['typeChange'] {
    if (!baseNode || !currentNode) {
      return undefined;
    }

    const baseType = this.getNodeType(baseNode);
    const currentType = this.getNodeType(currentNode);

    if (ignoreItems) {
      const baseBaseType = baseNode.nodeType();
      const currentBaseType = currentNode.nodeType();
      if (baseBaseType === currentBaseType) {
        return undefined;
      }
    }

    if (baseType !== currentType) {
      return { fromType: baseType, toType: currentType };
    }

    return undefined;
  }

  private computeFormulaChange(
    baseNode: SchemaNode | null,
    currentNode: SchemaNode | null,
  ): SchemaPatch['formulaChange'] {
    const baseFormula = baseNode?.formula();
    const currentFormula = currentNode?.formula();

    const baseExpr = baseFormula?.expression;
    const currentExpr = currentFormula?.expression;
    const baseVersion = baseFormula?.version;
    const currentVersion = currentFormula?.version;

    if (baseExpr !== currentExpr || baseVersion !== currentVersion) {
      return {
        fromFormula: baseExpr,
        toFormula: currentExpr,
        fromVersion: baseVersion,
        toVersion: currentVersion,
      };
    }

    return undefined;
  }

  private computeDefaultChange(
    baseNode: SchemaNode | null,
    currentNode: SchemaNode | null,
  ): SchemaPatch['defaultChange'] {
    const baseDefault = baseNode?.defaultValue();
    const currentDefault = currentNode?.defaultValue();

    const safeBaseDefault: DefaultValueType = isPrimitiveDefault(baseDefault)
      ? baseDefault
      : undefined;
    const safeCurrentDefault: DefaultValueType = isPrimitiveDefault(
      currentDefault,
    )
      ? currentDefault
      : undefined;

    if (safeBaseDefault !== safeCurrentDefault) {
      return {
        fromDefault: safeBaseDefault,
        toDefault: safeCurrentDefault,
      };
    }

    return undefined;
  }

  private computeDescriptionChange(
    baseNode: SchemaNode | null,
    currentNode: SchemaNode | null,
  ): SchemaPatch['descriptionChange'] {
    const baseDesc = baseNode?.metadata().description;
    const currentDesc = currentNode?.metadata().description;

    if (baseDesc !== currentDesc) {
      return { fromDescription: baseDesc, toDescription: currentDesc };
    }

    return undefined;
  }

  private computeDeprecatedChange(
    baseNode: SchemaNode | null,
    currentNode: SchemaNode | null,
  ): SchemaPatch['deprecatedChange'] {
    const baseDeprecated = baseNode?.metadata().deprecated;
    const currentDeprecated = currentNode?.metadata().deprecated;

    if (baseDeprecated !== currentDeprecated) {
      return { fromDeprecated: baseDeprecated, toDeprecated: currentDeprecated };
    }

    return undefined;
  }

  private computeForeignKeyChange(
    baseNode: SchemaNode | null,
    currentNode: SchemaNode | null,
  ): SchemaPatch['foreignKeyChange'] {
    const baseFk = baseNode?.foreignKey();
    const currentFk = currentNode?.foreignKey();

    if (baseFk !== currentFk) {
      return { fromForeignKey: baseFk, toForeignKey: currentFk };
    }

    return undefined;
  }

  private getNodeType(node: SchemaNode): string {
    if (node.isArray()) {
      const items = node.items();
      return `array<${this.getNodeType(items)}>`;
    }
    return node.nodeType();
  }

  private getFieldNameFromPath(jsonPointer: string): string {
    try {
      return jsonPointerToPath(jsonPointer).asSimple();
    } catch {
      return '';
    }
  }

  private isRenameMove(fromPointer: string, toPointer: string): boolean {
    try {
      const fromParent = jsonPointerToPath(fromPointer).parent();
      const toParent = jsonPointerToPath(toPointer).parent();
      return fromParent.equals(toParent);
    } catch {
      return false;
    }
  }

  private getNodeAtPath(
    tree: SchemaTree,
    jsonPointer: string,
  ): SchemaNode | null {
    try {
      const path = jsonPointerToPath(jsonPointer);
      const node = tree.nodeAt(path);
      return node.isNull() ? null : node;
    } catch {
      return null;
    }
  }
}
