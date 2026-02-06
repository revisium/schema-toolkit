import type { SchemaNode } from '../schema-node/index.js';
import type { SchemaTree } from '../schema-tree/index.js';
import type { Path } from '../path/index.js';
import { jsonPointerToPath } from '../path/index.js';
import { FormulaSerializer } from '../../model/schema-formula/serialization/FormulaSerializer.js';
import type { JsonPatchMove } from '../../types/index.js';
import type { DefaultValueType, JsonPatch, PropertyChange, PropertyName, SchemaPatch } from './types.js';

interface PropertyExtractor {
  property: PropertyName;
  extract: (node: SchemaNode | null, tree: SchemaTree) => unknown;
  compare?: (from: unknown, to: unknown) => boolean;
}

function isPrimitiveDefault(value: unknown): value is string | number | boolean {
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}

export class PatchEnricher {
  private readonly extractors: PropertyExtractor[];

  constructor(
    private readonly currentTree: SchemaTree,
    private readonly baseTree: SchemaTree,
  ) {
    this.extractors = this.buildExtractors();
  }

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
      return { patch, fieldName, propertyChanges: [] };
    }

    const propertyChanges = this.computeAddPropertyChanges(currentNode);
    return { patch, fieldName, propertyChanges };
  }

  private enrichRemovePatch(patch: JsonPatch, fieldName: string): SchemaPatch {
    return { patch, fieldName, propertyChanges: [] };
  }

  private enrichMovePatch(patch: JsonPatchMove, fieldName: string): SchemaPatch {
    const fromPath = patch.from;
    const isRename = this.isRenameMove(fromPath, patch.path);
    const movesIntoArray = this.movesIntoArrayBoundary(fromPath, patch.path);

    const baseNode = this.getNodeAtPath(this.baseTree, fromPath);
    const currentNode = this.getNodeAtPath(this.currentTree, patch.path);

    const propertyChanges = this.computePropertyChanges(baseNode, currentNode);

    return {
      patch,
      fieldName,
      propertyChanges,
      isRename: isRename || undefined,
      movesIntoArray: movesIntoArray || undefined,
    };
  }

  private enrichReplacePatch(patch: JsonPatch, fieldName: string): SchemaPatch {
    const baseNode = this.getNodeAtPath(this.baseTree, patch.path);
    const currentNode = this.getNodeAtPath(this.currentTree, patch.path);

    const isArrayMetadataPatch = baseNode?.isArray() && currentNode?.isArray();

    const skipProperties: PropertyName[] = isArrayMetadataPatch ? ['default'] : [];

    const propertyChanges = this.computePropertyChanges(
      baseNode,
      currentNode,
      { skipProperties },
    );

    return {
      patch,
      fieldName,
      propertyChanges,
      typeChange: this.computeTypeChange(baseNode, currentNode, isArrayMetadataPatch),
    };
  }

  private buildExtractors(): PropertyExtractor[] {
    return [
      {
        property: 'formula',
        extract: (node, tree) => {
          const formula = node?.formula();
          if (!formula || !node) {
            return undefined;
          }
          return FormulaSerializer.serializeExpression(tree, node.id(), formula, { strict: false });
        },
        compare: (from, to) => from === to,
      },
      {
        property: 'default',
        extract: (node) => {
          const value = node?.defaultValue();
          return isPrimitiveDefault(value) ? value as DefaultValueType : undefined;
        },
      },
      {
        property: 'description',
        extract: (node) => node?.metadata().description,
      },
      {
        property: 'deprecated',
        extract: (node) => node?.metadata().deprecated,
      },
      {
        property: 'foreignKey',
        extract: (node) => node?.foreignKey(),
      },
      {
        property: 'contentMediaType',
        extract: (node) => node?.contentMediaType(),
      },
      {
        property: 'ref',
        extract: (node) => node?.ref(),
      },
      {
        property: 'title',
        extract: (node) => node?.metadata().title,
      },
    ];
  }

  private computePropertyChanges(
    baseNode: SchemaNode | null,
    currentNode: SchemaNode | null,
    options?: { skipProperties?: PropertyName[] },
  ): PropertyChange[] {
    const skipSet = options?.skipProperties;
    const result: PropertyChange[] = [];

    for (const extractor of this.extractors) {
      if (skipSet?.includes(extractor.property)) {
        continue;
      }

      const from = extractor.extract(baseNode, this.baseTree);
      const to = extractor.extract(currentNode, this.currentTree);

      const areEqual = extractor.compare
        ? extractor.compare(from, to)
        : from === to;

      if (!areEqual) {
        result.push({ property: extractor.property, from, to });
      }
    }

    return result;
  }

  private computeAddPropertyChanges(node: SchemaNode): PropertyChange[] {
    const allChanges = this.computePropertyChanges(null, node);
    return allChanges.filter((change) => change.to !== undefined);
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
