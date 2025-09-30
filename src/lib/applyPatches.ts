import { JsonSchema, JsonSchemaTypeName } from '../types/schema.types.js';
import {
  JsonPatchAdd,
  JsonPatchMove,
  JsonPatchRemove,
  JsonPatchReplace,
} from '../types/json-patch.types.js';
import { JsonSchemaStore } from '../model/schema/json-schema.store.js';
import { createJsonSchemaStore } from './createJsonSchemaStore.js';
import { getJsonSchemaStoreByPath } from './getJsonSchemaStoreByPath.js';
import { getParentForPath } from './getParentForPath.js';
import {
  VALIDATE_JSON_FIELD_NAME_ERROR_MESSAGE,
  validateJsonFieldName,
} from './validateJsonFieldName.js';

export const applyReplacePatch = (
  store: JsonSchemaStore,
  patch: JsonPatchReplace,
  refs: Record<string, JsonSchema> = {},
): JsonSchemaStore => {
  const patchStore = createJsonSchemaStore(patch.value, refs);
  const foundStore = getJsonSchemaStoreByPath(store, patch.path);

  const parent = foundStore.parent;

  if (!parent) {
    return patchStore;
  }

  if (parent.type === JsonSchemaTypeName.Object) {
    parent.migratePropertyWithStore(foundStore.name, patchStore);
  } else if (parent.type === JsonSchemaTypeName.Array) {
    parent.migrateItems(patchStore);
  } else {
    throw new Error('Invalid parent');
  }

  return store;
};

export const applyRemovePatch = (
  rootStore: JsonSchemaStore,
  patch: JsonPatchRemove,
): void => {
  const foundStore = getJsonSchemaStoreByPath(rootStore, patch.path);
  const parent = foundStore.parent;

  if (!parent) {
    throw new Error('Parent does not exist');
  }

  if (parent.type !== JsonSchemaTypeName.Object) {
    throw new Error('Cannot remove from non-object');
  }

  parent.removeProperty(foundStore.name);
};

export const applyAddPatch = (
  rootStore: JsonSchemaStore,
  patch: JsonPatchAdd,
  refs: Record<string, JsonSchema> = {},
): void => {
  const patchStore = createJsonSchemaStore(patch.value, refs);

  const { parentPath, field } = getParentForPath(patch.path);
  const foundParent = getJsonSchemaStoreByPath(rootStore, parentPath);

  if (!foundParent) {
    throw new Error('Parent does not exist');
  }

  if (foundParent.type !== JsonSchemaTypeName.Object) {
    throw new Error('Cannot add to non-object');
  }

  if (foundParent.getProperty(field)) {
    throw new Error(`Field "${field}" already exists in parent`);
  }

  foundParent.addPropertyWithStore(field, patchStore);
};

export const applyMovePatch = (
  store: JsonSchemaStore,
  patch: JsonPatchMove,
): void => {
  const { parentPath: fromParentPath, field: fromField } = getParentForPath(
    patch.from,
  );
  const { parentPath: toParentPath, field: toField } = getParentForPath(
    patch.path,
  );

  const foundFromParent = getJsonSchemaStoreByPath(store, fromParentPath);
  const foundToParent = getJsonSchemaStoreByPath(store, toParentPath);

  const isValidToField = validateJsonFieldName(toField);

  if (!isValidToField) {
    throw new Error(
      `Invalid name: ${toField}. ${VALIDATE_JSON_FIELD_NAME_ERROR_MESSAGE}`,
    );
  }

  if (!foundFromParent || !foundToParent) {
    throw new Error('Cannot move from or to non-existent parent');
  }

  if (foundFromParent.type !== JsonSchemaTypeName.Object) {
    throw new Error('Cannot move from non-object parent');
  }

  const foundFromField = getJsonSchemaStoreByPath(store, patch.from);

  const isMovedPropertyInSameParentPatch =
    foundFromParent === foundToParent &&
    foundFromParent.type === JsonSchemaTypeName.Object &&
    foundFromParent.getProperty(fromField);

  if (isMovedPropertyInSameParentPatch) {
    return foundFromParent.changeName(fromField, toField);
  }

  if (foundToParent.type === JsonSchemaTypeName.Object) {
    foundFromParent.removeProperty(fromField);
    if (foundToParent.getProperty(toField)) {
      foundToParent.removeProperty(toField);
    }
    foundToParent.addPropertyWithStore(toField, foundFromField);
    return;
  }

  if (foundToParent.type === JsonSchemaTypeName.Array) {
    foundFromParent.removeProperty(fromField);
    foundToParent.replaceItems(foundFromField);

    return;
  }
  throw new Error('Invalid type of "to" parent');
};
