export enum JsonSchemaTypeName {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Array = 'array',
}

export type XFormula = {
  version: 1;
  expression: string;
};

export type JsonSchemaSharedFields = {
  deprecated?: boolean;
  description?: string;
  title?: string;
};

export type JsonStringSchema = {
  type: JsonSchemaTypeName.String;
  default: string;
  foreignKey?: string;
  readOnly?: boolean;
  title?: string;
  description?: string;
  deprecated?: boolean;
  pattern?: string;
  format?: 'date-time' | 'date' | 'time' | 'email' | 'regex';
  contentMediaType?:
    | 'text/plain'
    | 'text/markdown'
    | 'text/html'
    | 'application/json'
    | 'application/schema+json'
    | 'application/yaml';
  enum?: string[];
  'x-formula'?: XFormula;
} & JsonSchemaSharedFields;

export type JsonNumberSchema = {
  type: JsonSchemaTypeName.Number;
  default: number;
  readOnly?: boolean;
  title?: string;
  description?: string;
  deprecated?: boolean;
  'x-formula'?: XFormula;
} & JsonSchemaSharedFields;

export type JsonBooleanSchema = {
  type: JsonSchemaTypeName.Boolean;
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
  type: JsonSchemaTypeName.Object;
  additionalProperties: false;
  required: string[];
  properties: Record<string, JsonSchema>;
  title?: string;
  description?: string;
  deprecated?: boolean;
} & JsonSchemaSharedFields;

export type JsonArraySchema = {
  type: JsonSchemaTypeName.Array;
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
