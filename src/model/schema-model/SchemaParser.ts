import { nanoid } from 'nanoid';
import type {
  JsonSchema,
  JsonSchemaWithoutRef,
  JsonObjectSchema,
  JsonArraySchema,
  JsonStringSchema,
  JsonNumberSchema,
  JsonBooleanSchema,
} from '../../types/index.js';
import { JsonSchemaTypeName } from '../../types/index.js';
import type { SchemaNode, NodeMetadata, Formula } from '../../core/schema-node/index.js';
import {
  createObjectNode,
  createArrayNode,
  createStringNode,
  createNumberNode,
  createBooleanNode,
  createRefNode,
} from '../../core/schema-node/index.js';

export class SchemaParser {
  parse(schema: JsonObjectSchema): SchemaNode {
    return this.parseNode(schema, 'root');
  }

  private parseNode(schema: JsonSchema, name: string): SchemaNode {
    if ('$ref' in schema) {
      return createRefNode(
        nanoid(),
        name,
        schema.$ref,
        this.extractMetadata(schema),
      );
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

    return createObjectNode(
      nanoid(),
      name,
      children,
      this.extractMetadata(schema),
    );
  }

  private parseArray(schema: JsonArraySchema, name: string): SchemaNode {
    const items = this.parseNode(schema.items, 'items');
    return createArrayNode(
      nanoid(),
      name,
      items,
      this.extractMetadata(schema),
    );
  }

  private parseString(schema: JsonStringSchema, name: string): SchemaNode {
    return createStringNode(nanoid(), name, {
      defaultValue: schema.default,
      foreignKey: schema.foreignKey,
      formula: this.extractFormula(schema),
      metadata: this.extractMetadata(schema),
    });
  }

  private parseNumber(schema: JsonNumberSchema, name: string): SchemaNode {
    return createNumberNode(nanoid(), name, {
      defaultValue: schema.default,
      formula: this.extractFormula(schema),
      metadata: this.extractMetadata(schema),
    });
  }

  private parseBoolean(schema: JsonBooleanSchema, name: string): SchemaNode {
    return createBooleanNode(nanoid(), name, {
      defaultValue: schema.default,
      formula: this.extractFormula(schema),
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

  private extractFormula(
    schema: JsonStringSchema | JsonNumberSchema | JsonBooleanSchema,
  ): Formula | undefined {
    const xFormula = schema['x-formula'];
    if (!xFormula) {
      return undefined;
    }
    return {
      version: xFormula.version,
      expression: xFormula.expression,
    };
  }
}
