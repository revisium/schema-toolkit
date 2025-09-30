import {
  getArraySchema,
  getObjectSchema,
  getStringSchema,
} from '../../mocks/schema.mocks.js';
import { createJsonSchemaStore } from '../createJsonSchemaStore.js';
import { getJsonSchemaStoreByPath } from '../getJsonSchemaStoreByPath.js';
import { getDBJsonPathByJsonSchemaStore } from '../getDBJsonPathByJsonSchemaStore.js';
import { JsonArrayStore } from '../../model/schema/json-array.store.js';
import { JsonBooleanStore } from '../../model/schema/json-boolean.store.js';
import { JsonNumberStore } from '../../model/schema/json-number.store.js';
import { JsonObjectStore } from '../../model/schema/json-object.store.js';
import { JsonStringStore } from '../../model/schema/json-string.store.js';

describe('getDbJsonPathByJsonSchemaStore', () => {
  it('no parent', () => {
    const object = new JsonObjectStore();
    expect(getDBJsonPathByJsonSchemaStore(object)).toEqual('$');

    const array = new JsonArrayStore(object);
    expect(getDBJsonPathByJsonSchemaStore(array)).toEqual('$');

    const string = new JsonStringStore();
    expect(getDBJsonPathByJsonSchemaStore(string)).toEqual('$');

    const number = new JsonNumberStore();
    expect(getDBJsonPathByJsonSchemaStore(number)).toEqual('$');

    const boolean = new JsonBooleanStore();
    expect(getDBJsonPathByJsonSchemaStore(boolean)).toEqual('$');
  });

  it('object property', () => {
    const object = new JsonObjectStore();
    expect(getDBJsonPathByJsonSchemaStore(object)).toEqual('$');

    const string = new JsonStringStore();
    object.addPropertyWithStore('stringField', string);
    expect(getDBJsonPathByJsonSchemaStore(string)).toEqual('$.stringField');

    const number = new JsonNumberStore();
    object.addPropertyWithStore('numberField', number);
    expect(getDBJsonPathByJsonSchemaStore(number)).toEqual('$.numberField');

    const boolean = new JsonBooleanStore();
    object.addPropertyWithStore('booleanField', boolean);
    expect(getDBJsonPathByJsonSchemaStore(boolean)).toEqual('$.booleanField');
  });

  it('items of array', () => {
    const object = new JsonObjectStore();
    const array = new JsonArrayStore(object);
    expect(getDBJsonPathByJsonSchemaStore(object)).toEqual('$[*]');

    const string = new JsonStringStore();
    array.migrateItems(string);
    expect(getDBJsonPathByJsonSchemaStore(string)).toEqual('$[*]');

    const number = new JsonNumberStore();
    array.migrateItems(number);
    expect(getDBJsonPathByJsonSchemaStore(number)).toEqual('$[*]');

    const boolean = new JsonBooleanStore();
    array.migrateItems(boolean);
    expect(getDBJsonPathByJsonSchemaStore(boolean)).toEqual('$[*]');
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

    expect(
      getDBJsonPathByJsonSchemaStore(
        getJsonSchemaStoreByPath(
          store,
          '/properties/field/properties/arr/items/items/properties/subField/items/properties/subSubField',
        ),
      ),
    ).toEqual('$.field.arr[*][*].subField[*].subSubField');

    expect(
      getDBJsonPathByJsonSchemaStore(
        getJsonSchemaStoreByPath(
          store,
          '/properties/field/properties/arr/items/items/properties/subField/items',
        ),
      ),
    ).toEqual('$.field.arr[*][*].subField[*]');

    expect(
      getDBJsonPathByJsonSchemaStore(
        getJsonSchemaStoreByPath(
          store,
          '/properties/field/properties/arr/items/items/properties/subField',
        ),
      ),
    ).toEqual('$.field.arr[*][*].subField');

    expect(
      getDBJsonPathByJsonSchemaStore(
        getJsonSchemaStoreByPath(
          store,
          '/properties/field/properties/arr/items/items',
        ),
      ),
    ).toEqual('$.field.arr[*][*]');

    expect(
      getDBJsonPathByJsonSchemaStore(
        getJsonSchemaStoreByPath(
          store,
          '/properties/field/properties/arr/items',
        ),
      ),
    ).toEqual('$.field.arr[*]');

    expect(
      getDBJsonPathByJsonSchemaStore(
        getJsonSchemaStoreByPath(store, '/properties/field/properties/arr'),
      ),
    ).toEqual('$.field.arr');

    expect(
      getDBJsonPathByJsonSchemaStore(
        getJsonSchemaStoreByPath(store, '/properties/field'),
      ),
    ).toEqual('$.field');
  });

  it('complex array in root', () => {
    const store = createJsonSchemaStore(
      getArraySchema(
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
    );

    expect(
      getDBJsonPathByJsonSchemaStore(
        getJsonSchemaStoreByPath(
          store,
          '/items/items/properties/subField/items/properties/subSubField',
        ),
      ),
    ).toEqual('$[*][*].subField[*].subSubField');

    expect(
      getDBJsonPathByJsonSchemaStore(
        getJsonSchemaStoreByPath(store, '/items/items'),
      ),
    ).toEqual('$[*][*]');

    expect(
      getDBJsonPathByJsonSchemaStore(getJsonSchemaStoreByPath(store, '/items')),
    ).toEqual('$[*]');
  });
});
