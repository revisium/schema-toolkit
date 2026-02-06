import type { JsonPatch } from '../../types/index.js';

export type { JsonPatch };

export type DefaultValueType = string | number | boolean | undefined;

export type PropertyName =
  | 'formula'
  | 'default'
  | 'description'
  | 'deprecated'
  | 'foreignKey'
  | 'contentMediaType'
  | 'ref'
  | 'title';

export interface PropertyChange {
  property: PropertyName;
  from: unknown;
  to: unknown;
}

export interface SchemaPatch {
  patch: JsonPatch;
  fieldName: string;
  typeChange?: { fromType: string; toType: string };
  isRename?: boolean;
  movesIntoArray?: boolean;
  propertyChanges: PropertyChange[];
}
