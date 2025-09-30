import { JsonPatch } from './json-patch.types.js';
import { JsonSchema } from './schema.types.js';

export type UpdateMigration = {
  changeType: 'update';
  tableId: string;
  hash: string;
  id: string;
  patches: JsonPatch[];
};

export type RenameMigration = {
  changeType: 'rename';
  id: string;
  tableId: string;
  nextTableId: string;
};

export type RemoveMigration = {
  changeType: 'remove';
  tableId: string;
  id: string;
};

export type InitMigration = {
  changeType: 'init';
  tableId: string;
  hash: string;
  id: string;
  schema: JsonSchema;
};

export type Migration =
  | InitMigration
  | UpdateMigration
  | RenameMigration
  | RemoveMigration;
