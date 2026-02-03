import type { JsonPatch } from '../../types/index.js';

export type { JsonPatch };

export type DefaultValueType = string | number | boolean | undefined;

export type MetadataChangeType =
  | 'formula'
  | 'description'
  | 'deprecated'
  | 'foreignKey'
  | 'default'
  | 'enum'
  | 'format'
  | 'contentMediaType';

export interface SchemaPatch {
  patch: JsonPatch;
  fieldName: string;
  metadataChanges: MetadataChangeType[];
  typeChange?: {
    fromType: string;
    toType: string;
  };
  formulaChange?: {
    fromFormula: string | undefined;
    toFormula: string | undefined;
    fromVersion: number | undefined;
    toVersion: number | undefined;
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
  contentMediaTypeChange?: {
    fromContentMediaType: string | undefined;
    toContentMediaType: string | undefined;
  };
  isRename?: boolean;
  movesIntoArray?: boolean;
}
