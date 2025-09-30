import { SystemSchemaIds } from '../consts/system-schema-ids.js';
import { createJsonSchemaStore } from './createJsonSchemaStore.js';
import {
  fileSchema,
  rowCreatedAtSchema,
  rowCreatedIdSchema,
  rowHashSchema,
  rowPublishedAtSchema,
  rowSchemaHashSchema,
  rowUpdatedAtSchema,
  rowVersionIdSchema,
  rowIdSchema,
} from '../plugins/index.js';
import { JsonSchema } from '../types/schema.types.js';

export const pluginRefs: Readonly<Record<string, JsonSchema>> = {
  [SystemSchemaIds.RowId]: rowIdSchema,
  [SystemSchemaIds.RowVersionId]: rowVersionIdSchema,
  [SystemSchemaIds.RowCreatedId]: rowCreatedIdSchema,
  [SystemSchemaIds.RowCreatedAt]: rowCreatedAtSchema,
  [SystemSchemaIds.RowPublishedAt]: rowPublishedAtSchema,
  [SystemSchemaIds.RowUpdatedAt]: rowUpdatedAtSchema,
  [SystemSchemaIds.RowHash]: rowHashSchema,
  [SystemSchemaIds.RowSchemaHash]: rowSchemaHashSchema,
  [SystemSchemaIds.File]: fileSchema,
};

export const resolveRefs = (schema: JsonSchema) => {
  const store = createJsonSchemaStore(schema, pluginRefs);
  return store.getPlainSchema({ skip$Ref: true });
};
