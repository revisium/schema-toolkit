import { nanoid } from 'nanoid';
import type {
  JsonSchema,
  JsonSchemaWithoutRef,
  JsonObjectSchema,
  JsonArraySchema,
  JsonStringSchema,
  JsonNumberSchema,
  JsonBooleanSchema,
  XFormula,
} from '../../types/index.js';
import { JsonSchemaTypeName } from '../../types/index.js';
import type { SchemaNode, NodeMetadata } from '../../core/schema-node/index.js';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  createBooleanNode,
  createRefNode,
} from '../../core/schema-node/index.js';
import type { SchemaTree } from '../../core/schema-tree/index.js';
import { ParsedFormula } from '../schema-formula/index.js';
import type { TreeFormulaValidationError } from '../../core/validation/index.js';

interface PendingFormula {
  nodeId: string;
  expression: string;
}

export class SchemaParser {
  private pendingFormulas: PendingFormula[] = [];
  private _parseErrors: TreeFormulaValidationError[] = [];

  parse(schema: JsonObjectSchema): SchemaNode {
    this.pendingFormulas = [];
    this._parseErrors = [];
    return this.parseNode(schema, 'root');
  }

  parseFormulas(tree: SchemaTree): void {
    for (const pending of this.pendingFormulas) {
      const node = tree.nodeById(pending.nodeId);
      if (node.isNull()) {
        continue;
      }
      try {
        const formula = new ParsedFormula(tree, pending.nodeId, pending.expression);
        node.setFormula(formula);
      } catch (error) {
        this._parseErrors.push({
          nodeId: pending.nodeId,
          message: (error as Error).message,
        });
      }
    }
    this.pendingFormulas = [];
  }

  get parseErrors(): TreeFormulaValidationError[] {
    return this._parseErrors;
  }

  private parseNode(schema: JsonSchema, name: string): SchemaNode {
    if ('$ref' in schema) {
      return createRefNode(nanoid(), name, schema.$ref, this.extractMetadata(schema));
    }

    const schemaWithType = schema as JsonSchemaWithoutRef;
    switch (schemaWithType.type) {
      case JsonSchemaTypeName.Object:
        return this.parseObject(schemaWithType, name);
      case JsonSchemaTypeName.Array:
        return this.parseArray(schemaWithType, name);
      case JsonSchemaTypeName.String:
        return this.parseString(schemaWithType, name);
      case JsonSchemaTypeName.Number:
        return this.parseNumber(schemaWithType, name);
      case JsonSchemaTypeName.Boolean:
        return this.parseBoolean(schemaWithType, name);
      default:
        throw new Error(`Unknown schema type: ${(schemaWithType as { type: string }).type}`);
    }
  }

  private parseObject(schema: JsonObjectSchema, name: string): SchemaNode {
    const children: SchemaNode[] = [];

    for (const propName of Object.keys(schema.properties).sort((a, b) => a.localeCompare(b))) {
      const propSchema = schema.properties[propName];
      if (propSchema) {
        children.push(this.parseNode(propSchema, propName));
      }
    }

    return createObjectNode(nanoid(), name, children, this.extractMetadata(schema));
  }

  private parseArray(schema: JsonArraySchema, name: string): SchemaNode {
    const items = this.parseNode(schema.items, 'items');
    return createArrayNode(nanoid(), name, items, this.extractMetadata(schema));
  }

  private parseString(schema: JsonStringSchema, name: string): SchemaNode {
    const nodeId = nanoid();
    this.collectFormula(nodeId, schema['x-formula']);
    return createStringNode(nodeId, name, {
      defaultValue: schema.default,
      foreignKey: schema.foreignKey,
      metadata: this.extractMetadata(schema),
    });
  }

  private parseNumber(schema: JsonNumberSchema, name: string): SchemaNode {
    const nodeId = nanoid();
    this.collectFormula(nodeId, schema['x-formula']);
    return createNumberNode(nodeId, name, {
      defaultValue: schema.default,
      metadata: this.extractMetadata(schema),
    });
  }

  private parseBoolean(schema: JsonBooleanSchema, name: string): SchemaNode {
    const nodeId = nanoid();
    this.collectFormula(nodeId, schema['x-formula']);
    return createBooleanNode(nodeId, name, {
      defaultValue: schema.default,
      metadata: this.extractMetadata(schema),
    });
  }

  private extractMetadata(schema: JsonSchema): NodeMetadata | undefined {
    const meta: NodeMetadata = {};
    let hasValue = false;

    if ('title' in schema && schema.title) {
      (meta as { title: string }).title = schema.title;
      hasValue = true;
    }
    if ('description' in schema && schema.description) {
      (meta as { description: string }).description = schema.description;
      hasValue = true;
    }
    if ('deprecated' in schema && schema.deprecated) {
      (meta as { deprecated: boolean }).deprecated = schema.deprecated;
      hasValue = true;
    }

    return hasValue ? meta : undefined;
  }

  private collectFormula(nodeId: string, xFormula: XFormula | undefined): void {
    if (xFormula) {
      this.pendingFormulas.push({ nodeId, expression: xFormula.expression });
    }
  }
}
