import type { SchemaNode, Formula } from '../schema-node/index.js';
import type { SchemaTree } from '../schema-tree/index.js';
import type { Path } from '../path/index.js';
import { jsonPointerToPath } from '../path/index.js';
import { FormulaSerializer } from '../../model/schema-formula/serialization/FormulaSerializer.js';
import type { JsonPatchMove } from '../../types/index.js';
import type { DefaultValueType, JsonPatch, MetadataChangeType, SchemaPatch } from './types.js';

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
      return { patch, fieldName, metadataChanges: [] };
    }

    const metadata = this.computeAddMetadata(currentNode);
    return {
      patch,
      fieldName,
      metadataChanges: this.computeMetadataChanges(metadata),
      ...metadata,
    };
  }

  private enrichRemovePatch(patch: JsonPatch, fieldName: string): SchemaPatch {
    return { patch, fieldName, metadataChanges: [] };
  }

  private enrichMovePatch(patch: JsonPatchMove, fieldName: string): SchemaPatch {
    const fromPath = patch.from;
    const isRename = this.isRenameMove(fromPath, patch.path);
    const movesIntoArray = this.movesIntoArrayBoundary(fromPath, patch.path);

    const baseNode = this.getNodeAtPath(this.baseTree, fromPath);
    const currentNode = this.getNodeAtPath(this.currentTree, patch.path);

    const formulaChange = this.computeFormulaChange(baseNode, currentNode);
    const metadataChanges: MetadataChangeType[] = [];
    if (formulaChange) {
      metadataChanges.push('formula');
    }

    return {
      patch,
      fieldName,
      metadataChanges,
      isRename: isRename || undefined,
      movesIntoArray: movesIntoArray || undefined,
      formulaChange,
    };
  }

  private enrichReplacePatch(patch: JsonPatch, fieldName: string): SchemaPatch {
    const baseNode = this.getNodeAtPath(this.baseTree, patch.path);
    const currentNode = this.getNodeAtPath(this.currentTree, patch.path);

    const isArrayMetadataPatch = baseNode?.isArray() && currentNode?.isArray();

    const formulaChange = this.computeFormulaChange(baseNode, currentNode);
    const defaultChange = isArrayMetadataPatch
      ? undefined
      : this.computeDefaultChange(baseNode, currentNode);
    const descriptionChange = this.computeDescriptionChange(baseNode, currentNode);
    const deprecatedChange = this.computeDeprecatedChange(baseNode, currentNode);
    const foreignKeyChange = this.computeForeignKeyChange(baseNode, currentNode);
    const contentMediaTypeChange = this.computeContentMediaTypeChange(baseNode, currentNode);

    const metadataChanges = this.computeMetadataChanges({
      formulaChange,
      defaultChange,
      descriptionChange,
      deprecatedChange,
      foreignKeyChange,
      contentMediaTypeChange,
    });

    return {
      patch,
      fieldName,
      metadataChanges,
      typeChange: this.computeTypeChange(baseNode, currentNode, isArrayMetadataPatch),
      formulaChange,
      defaultChange,
      descriptionChange,
      deprecatedChange,
      foreignKeyChange,
      contentMediaTypeChange,
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
        toFormula: this.getFormulaExpression(formula, this.currentTree, node.id()),
        fromVersion: undefined,
        toVersion: formula.version(),
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

    const contentMediaType = node.contentMediaType();
    if (contentMediaType) {
      result.contentMediaTypeChange = {
        fromContentMediaType: undefined,
        toContentMediaType: contentMediaType,
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

    const baseExpr = baseFormula && baseNode
      ? this.getFormulaExpression(baseFormula, this.baseTree, baseNode.id())
      : undefined;
    const currentExpr = currentFormula && currentNode
      ? this.getFormulaExpression(currentFormula, this.currentTree, currentNode.id())
      : undefined;
    const baseVersion = baseFormula?.version();
    const currentVersion = currentFormula?.version();

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

  private getFormulaExpression(
    formula: Formula,
    tree: SchemaTree,
    nodeId: string,
  ): string {
    return FormulaSerializer.serializeExpression(tree, nodeId, formula, { strict: false });
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

  private computeContentMediaTypeChange(
    baseNode: SchemaNode | null,
    currentNode: SchemaNode | null,
  ): SchemaPatch['contentMediaTypeChange'] {
    const baseMediaType = baseNode?.contentMediaType();
    const currentMediaType = currentNode?.contentMediaType();

    if (baseMediaType !== currentMediaType) {
      return {
        fromContentMediaType: baseMediaType,
        toContentMediaType: currentMediaType,
      };
    }

    return undefined;
  }

  private computeMetadataChanges(changes: Partial<SchemaPatch>): MetadataChangeType[] {
    const result: MetadataChangeType[] = [];

    if (changes.formulaChange) {
      result.push('formula');
    }
    if (changes.defaultChange) {
      result.push('default');
    }
    if (changes.descriptionChange) {
      result.push('description');
    }
    if (changes.deprecatedChange) {
      result.push('deprecated');
    }
    if (changes.foreignKeyChange) {
      result.push('foreignKey');
    }
    if (changes.contentMediaTypeChange) {
      result.push('contentMediaType');
    }

    return result;
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

  private movesIntoArrayBoundary(
    fromPointer: string,
    toPointer: string,
  ): boolean {
    try {
      const fromPath = jsonPointerToPath(fromPointer);
      const toPath = jsonPointerToPath(toPointer);
      const fromArrayDepth = this.countArrayDepth(fromPath);
      const toArrayDepth = this.countArrayDepth(toPath);
      return toArrayDepth > fromArrayDepth;
    } catch {
      return false;
    }
  }

  private countArrayDepth(path: Path): number {
    return path.segments().filter((seg) => seg.isItems()).length;
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
