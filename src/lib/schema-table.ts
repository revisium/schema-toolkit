import { JsonSchema } from '../types/schema.types.js';
import { JsonValue } from '../types/json.types.js';
import { JsonPatch } from '../types/json-patch.types.js';
import { JsonSchemaStore } from '../model/schema/json-schema.store.js';
import { JsonValueStore } from '../model/value/json-value.store.js';
import { getTransformation } from '../model/value/value-transformation.js';
import { createJsonSchemaStore } from './createJsonSchemaStore.js';
import { createJsonValueStore } from './createJsonValueStore.js';
import {
  applyAddPatch,
  applyMovePatch,
  applyRemovePatch,
  applyReplacePatch,
} from './applyPatches.js';

export class SchemaTable {
  private readonly rows = new Map<string, JsonValueStore>();
  private store: JsonSchemaStore;

  constructor(
    schema: JsonSchema,
    private readonly refs: Record<string, JsonSchema> = {},
  ) {
    this.store = createJsonSchemaStore(schema, refs);
  }

  public applyPatches(patches: JsonPatch[]): void {
    patches.forEach((patch) => {
      switch (patch.op) {
        case 'replace': {
          const nextStore = applyReplacePatch(this.store, patch, this.refs);
          if (nextStore !== this.store) {
            this.migrateRows(nextStore);
          }
          break;
        }
        case 'remove': {
          applyRemovePatch(this.store, patch);
          break;
        }
        case 'add': {
          applyAddPatch(this.store, patch, this.refs);
          break;
        }
        case 'move': {
          applyMovePatch(this.store, patch);
          break;
        }
        default:
          throw new Error(`Unsupported patch operation`);
      }
    });
  }

  public getSchema(): JsonSchema {
    return this.store.getPlainSchema();
  }

  public addRow(rowId: string, data: JsonValue) {
    const row = createJsonValueStore(this.store, rowId, data);

    this.rows.set(rowId, row);
  }

  public getRow(id: string): JsonValue {
    const row = this.rows.get(id);

    if (!row) {
      throw new Error('Invalid id');
    }

    return row.getPlainValue();
  }

  public getRows(): { id: string; data: JsonValue }[] {
    return [...this.rows].map(([id, data]) => ({
      id,
      data: data.getPlainValue(),
    }));
  }

  private migrateRows(nextStore: JsonSchemaStore): void {
    const transformation = getTransformation(this.store, nextStore);

    if (transformation) {
      for (const [rowId, row] of this.rows) {
        const rawNextValue = transformation(
          row.getPlainValue(),
          nextStore.default,
        ) as JsonValue;

        const nextRow = createJsonValueStore(nextStore, rowId, rawNextValue);
        this.rows.set(rowId, nextRow);
      }
    }

    this.store = nextStore;
  }
}
