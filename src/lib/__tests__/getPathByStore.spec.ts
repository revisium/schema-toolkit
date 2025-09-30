import {
  getArraySchema,
  getObjectSchema,
  getStringSchema,
} from '../../mocks/schema.mocks.js';
import { createJsonSchemaStore } from '../createJsonSchemaStore';
import { getJsonSchemaStoreByPath } from '../getJsonSchemaStoreByPath';
import { getPathByStore } from '../getPathByStore';
import { JsonArrayStore } from '../../model/schema/json-array.store';
import { JsonBooleanStore } from '../../model/schema/json-boolean.store';
import { JsonNumberStore } from '../../model/schema/json-number.store';
import { JsonObjectStore } from '../../model/schema/json-object.store';
import { JsonStringStore } from '../../model/schema/json-string.store';

describe('getPathByStore', () => {
  it('no parent', () => {
    const object = new JsonObjectStore();
    expect(getPathByStore(object)).toEqual('/');

    const array = new JsonArrayStore(object);
    expect(getPathByStore(array)).toEqual('/');

    const string = new JsonStringStore();
    expect(getPathByStore(string)).toEqual('/');

    const number = new JsonNumberStore();
    expect(getPathByStore(number)).toEqual('/');

    const boolean = new JsonBooleanStore();
    expect(getPathByStore(boolean)).toEqual('/');
  });

  it('object property', () => {
    const object = new JsonObjectStore();
    expect(getPathByStore(object)).toEqual('/');

    const string = new JsonStringStore();
    object.addPropertyWithStore('stringField', string);
    expect(getPathByStore(string)).toEqual('/properties/stringField');

    const number = new JsonNumberStore();
    object.addPropertyWithStore('numberField', number);
    expect(getPathByStore(number)).toEqual('/properties/numberField');

    const boolean = new JsonBooleanStore();
    object.addPropertyWithStore('booleanField', boolean);
    expect(getPathByStore(boolean)).toEqual('/properties/booleanField');
  });

  it('items of array', () => {
    const object = new JsonObjectStore();
    const array = new JsonArrayStore(object);
    expect(getPathByStore(object)).toEqual('/items');

    const string = new JsonStringStore();
    array.migrateItems(string);
    expect(getPathByStore(string)).toEqual('/items');

    const number = new JsonNumberStore();
    array.migrateItems(number);
    expect(getPathByStore(number)).toEqual('/items');

    const boolean = new JsonBooleanStore();
    array.migrateItems(boolean);
    expect(getPathByStore(boolean)).toEqual('/items');
  });

  it('complex', () => {
    const store = createJsonSchemaStore(
      getObjectSchema({
        field: getObjectSchema({
          arr: getArraySchema(
            getArraySchema(
              getObjectSchema({
                subField: getArraySchema(
                  getObjectSchema({
                    subSubField: getStringSchema(),
                  }),
                ),
              }),
            ),
          ),
        }),
      }),
    );

    const path =
      '/properties/field/properties/arr/items/items/properties/subField/items/properties/subSubField';

    const item = getJsonSchemaStoreByPath(store, path);

    expect(getPathByStore(item)).toEqual(path);
  });
});
