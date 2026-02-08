/** @deprecated Use string literals ('string', 'number', etc.) or the `JsonSchemaType` union instead. */
export enum JsonSchemaTypeName {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
}

export type JsonSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export type XFormula = {
  version: 1;
  expression: string;
};

export type JsonSchemaSharedFields = {
  deprecated?: boolean;
  description?: string;
  title?: string;
};

export type ContentMediaType =
  | 'text/plain'
  | 'text/markdown'
  | 'text/html'
  | 'application/json'
  | 'application/schema+json'
  | 'application/yaml';

export type JsonStringSchema = {
  type: 'string';
  default: string;
  foreignKey?: string;
  readOnly?: boolean;
  required?: boolean;
  title?: string;
  description?: string;
  deprecated?: boolean;
  pattern?: string;
  format?: 'date-time' | 'date' | 'time' | 'email' | 'regex';
  contentMediaType?: ContentMediaType;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  'x-formula'?: XFormula;
} & JsonSchemaSharedFields;

export type JsonNumberSchema = {
  type: 'number';
  default: number;
  readOnly?: boolean;
  title?: string;
  description?: string;
  deprecated?: boolean;
  minimum?: number;
  maximum?: number;
  enum?: number[];
  'x-formula'?: XFormula;
} & JsonSchemaSharedFields;

export type JsonBooleanSchema = {
  type: 'boolean';
  default: boolean;
  readOnly?: boolean;
  title?: string;
  description?: string;
  deprecated?: boolean;
  'x-formula'?: XFormula;
} & JsonSchemaSharedFields;

export type JsonSchemaPrimitives =
  | JsonStringSchema
  | JsonNumberSchema
  | JsonBooleanSchema;

export type JsonObjectSchema = {
  type: 'object';
  additionalProperties: false;
  required: string[];
  properties: Record<string, JsonSchema>;
  title?: string;
  description?: string;
  deprecated?: boolean;
} & JsonSchemaSharedFields;

export type JsonArraySchema = {
  type: 'array';
  items: JsonSchema;
  title?: string;
  description?: string;
  deprecated?: boolean;
} & JsonSchemaSharedFields;

export type JsonRefSchema = {
  $ref: string;
  title?: string;
  description?: string;
  deprecated?: boolean;
};

export type JsonSchema =
  | JsonObjectSchema
  | JsonArraySchema
  | JsonSchemaPrimitives
  | JsonRefSchema;

export type JsonSchemaWithoutRef =
  | JsonObjectSchema
  | JsonArraySchema
  | JsonSchemaPrimitives;
