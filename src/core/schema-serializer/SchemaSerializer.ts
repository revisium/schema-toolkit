import type { SchemaNode, Formula } from '../schema-node/index.js';
import type { SchemaTree } from '../schema-tree/index.js';
import type { SerializeOptions } from './types.js';
import type {
  JsonSchema,
  JsonObjectSchema,
  JsonArraySchema,
  JsonStringSchema,
  JsonNumberSchema,
  JsonBooleanSchema,
  JsonRefSchema,
  XFormula,
} from '../../types/index.js';
import { JsonSchemaTypeName } from '../../types/index.js';
import { FormulaSerializer } from '../schema-formula/index.js';

export class SchemaSerializer {
  private tree: SchemaTree | null = null;
  private excludeNodeIds: Set<string> = new Set();

  serializeNode(
    node: SchemaNode,
    tree: SchemaTree,
    options?: SerializeOptions,
  ): JsonSchema {
    this.tree = tree;
    this.excludeNodeIds = options?.excludeNodeIds ?? new Set();
    try {
      return this.serialize(node);
    } finally {
      this.tree = null;
      this.excludeNodeIds = new Set();
    }
  }

  serializeTree(tree: SchemaTree): JsonObjectSchema {
    return this.serializeNode(tree.root(), tree) as JsonObjectSchema;
  }

  private serialize(node: SchemaNode): JsonSchema {
    if (node.isNull()) {
      throw new Error('Cannot serialize null node');
    }

    const ref = node.ref();
    if (ref) {
      return this.serializeRef(node, ref);
    }

    if (node.isObject()) {
      return this.serializeObject(node);
    }

    if (node.isArray()) {
      return this.serializeArray(node);
    }

    return this.serializePrimitive(node);
  }

  private serializeObject(node: SchemaNode): JsonObjectSchema {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const child of node.properties()) {
      if (this.shouldExclude(child)) {
        continue;
      }
      properties[child.name()] = this.serialize(child);
      required.push(child.name());
    }

    const result: JsonObjectSchema = {
      type: JsonSchemaTypeName.Object,
      properties,
      additionalProperties: false,
      required,
    };

    return this.addMetadata(result, node);
  }

  private serializeArray(node: SchemaNode): JsonArraySchema {
    const items = node.items();
    if (items.isNull()) {
      throw new Error('Array node must have items');
    }

    const result: JsonArraySchema = {
      type: JsonSchemaTypeName.Array,
      items: this.serialize(items),
    };

    return this.addMetadata(result, node);
  }

  private serializeRef(node: SchemaNode, ref: string): JsonRefSchema {
    const result: JsonRefSchema = {
      $ref: ref,
    };

    return this.addMetadata(result, node);
  }

  private serializePrimitive(node: SchemaNode): JsonSchema {
    const nodeType = node.nodeType();

    switch (nodeType) {
      case 'string':
        return this.serializeString(node);
      case 'number':
        return this.serializeNumber(node);
      case 'boolean':
        return this.serializeBoolean(node);
      default:
        throw new Error(`Unknown primitive type: ${nodeType}`);
    }
  }

  private serializeString(node: SchemaNode): JsonStringSchema {
    const result: JsonStringSchema = {
      type: JsonSchemaTypeName.String,
      default: (node.defaultValue() as string) ?? '',
    };

    const foreignKey = node.foreignKey();
    if (foreignKey) {
      result.foreignKey = foreignKey;
    }

    const contentMediaType = node.contentMediaType();
    if (contentMediaType && this.isValidContentMediaType(contentMediaType)) {
      result.contentMediaType = contentMediaType;
    }

    const formula = node.formula();
    if (formula) {
      result.readOnly = true;
      result['x-formula'] = this.serializeFormula(node, formula);
    }

    return this.addMetadata(result, node);
  }

  private serializeNumber(node: SchemaNode): JsonNumberSchema {
    const result: JsonNumberSchema = {
      type: JsonSchemaTypeName.Number,
      default: (node.defaultValue() as number) ?? 0,
    };

    const formula = node.formula();
    if (formula) {
      result.readOnly = true;
      result['x-formula'] = this.serializeFormula(node, formula);
    }

    return this.addMetadata(result, node);
  }

  private serializeBoolean(node: SchemaNode): JsonBooleanSchema {
    const result: JsonBooleanSchema = {
      type: JsonSchemaTypeName.Boolean,
      default: (node.defaultValue() as boolean) ?? false,
    };

    const formula = node.formula();
    if (formula) {
      result.readOnly = true;
      result['x-formula'] = this.serializeFormula(node, formula);
    }

    return this.addMetadata(result, node);
  }

  private serializeFormula(node: SchemaNode, formula: Formula): XFormula {
    if (!this.tree) {
      throw new Error(
        'Cannot serialize formula without tree context. Use serializeNode with tree.',
      );
    }

    try {
      return FormulaSerializer.toXFormula(this.tree, node.id(), formula);
    } catch {
      return { version: 1, expression: '' };
    }
  }

  private addMetadata<T extends JsonSchema>(schema: T, node: SchemaNode): T {
    const meta = node.metadata();

    if (meta.title) {
      (schema as JsonSchema & { title?: string }).title = meta.title;
    }
    if (meta.description) {
      (schema as JsonSchema & { description?: string }).description =
        meta.description;
    }
    if (meta.deprecated) {
      (schema as JsonSchema & { deprecated?: boolean }).deprecated =
        meta.deprecated;
    }

    return schema;
  }

  private shouldExclude(node: SchemaNode): boolean {
    return this.excludeNodeIds.has(node.id());
  }

  private isValidContentMediaType(
    value: string,
  ): value is NonNullable<JsonStringSchema['contentMediaType']> {
    const validTypes = [
      'text/plain',
      'text/markdown',
      'text/html',
      'application/json',
      'application/schema+json',
      'application/yaml',
    ];
    return validTypes.includes(value);
  }
}
