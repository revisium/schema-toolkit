import type { ReactivityAdapter } from '../../core/reactivity/types.js';
import type { JsonObjectSchema, JsonSchema } from '../../types/schema.types.js';
import type { ForeignKeyResolver } from '../foreign-key-resolver/ForeignKeyResolver.js';
import type { RowData } from '../foreign-key-resolver/types.js';
import {
  ForeignKeyNotFoundError,
  ForeignKeyResolverNotConfiguredError,
} from '../foreign-key-resolver/errors.js';
import { StringValueNode } from './StringValueNode.js';
import type { ValueNode } from './types.js';

export interface ForeignKeyValueNode extends ValueNode {
  readonly value: string;
  readonly foreignKey: string;

  getRow(): Promise<RowData>;
  getSchema(): Promise<JsonObjectSchema>;

  readonly isLoading: boolean;
}

export function isForeignKeyValueNode(node: ValueNode): node is ForeignKeyValueNode {
  return (
    node instanceof ForeignKeyValueNodeImpl ||
    ('foreignKey' in node && typeof (node as ForeignKeyValueNode).foreignKey === 'string')
  );
}

export class ForeignKeyValueNodeImpl extends StringValueNode implements ForeignKeyValueNode {
  private readonly _foreignKey: string;

  constructor(
    id: string | undefined,
    name: string,
    schema: JsonSchema,
    value?: string,
    reactivity?: ReactivityAdapter,
    private readonly fkResolver?: ForeignKeyResolver,
  ) {
    super(id, name, schema, value, reactivity);

    const schemaFk =
      'foreignKey' in schema && typeof schema.foreignKey === 'string'
        ? schema.foreignKey
        : undefined;

    if (!schemaFk) {
      throw new Error('ForeignKeyValueNode requires a schema with foreignKey property');
    }

    this._foreignKey = schemaFk;
  }

  get foreignKey(): string {
    return this._foreignKey;
  }

  get isLoading(): boolean {
    if (!this.fkResolver || !this._value) {
      return false;
    }
    return this.fkResolver.isLoadingRow(this._foreignKey, this._value);
  }

  async getRow(): Promise<RowData> {
    if (!this.fkResolver) {
      throw new ForeignKeyResolverNotConfiguredError();
    }

    if (!this._value) {
      throw new ForeignKeyNotFoundError(this._foreignKey, this._value);
    }

    return this.fkResolver.getRowData(this._foreignKey, this._value);
  }

  async getSchema(): Promise<JsonObjectSchema> {
    if (!this.fkResolver) {
      throw new ForeignKeyResolverNotConfiguredError();
    }

    return this.fkResolver.getSchema(this._foreignKey);
  }
}
