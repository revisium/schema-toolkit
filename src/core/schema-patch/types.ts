import type { JsonSchema } from '../../types/index.js';

export interface JsonPatch {
  op: 'add' | 'remove' | 'replace' | 'move';
  path: string;
  from?: string;
  value?: JsonSchema;
}

export type DefaultValueType = string | number | boolean | undefined;

export interface SchemaPatch {
  patch: JsonPatch;
  fieldName: string;
  typeChange?: {
    fromType: string;
    toType: string;
  };
  formulaChange?: {
    fromFormula: string | undefined;
    toFormula: string | undefined;
  };
  defaultChange?: {
    fromDefault: DefaultValueType;
    toDefault: DefaultValueType;
  };
  descriptionChange?: {
    fromDescription: string | undefined;
    toDescription: string | undefined;
  };
  deprecatedChange?: {
    fromDeprecated: boolean | undefined;
    toDeprecated: boolean | undefined;
  };
  foreignKeyChange?: {
    fromForeignKey: string | undefined;
    toForeignKey: string | undefined;
  };
  isRename?: boolean;
}
