import Ajv, { ValidateFunction } from 'ajv/dist/2020';
import { metaSchema } from '../validation-schemas/meta-schema.js';
import { jsonPatchSchema } from '../validation-schemas/json-patch-schema.js';
import { tableMigrationsSchema } from '../validation-schemas/table-migrations-schema.js';
import { historyPatchesSchema } from '../validation-schemas/history-patches-schema.js';
import { tableViewsSchema } from '../validation-schemas/table-views-schema.js';
import {
  ajvRowIdSchema,
  ajvRowCreatedIdSchema,
  ajvRowVersionIdSchema,
  ajvRowCreatedAtSchema,
  ajvRowPublishedAtSchema,
  ajvRowUpdatedAtSchema,
  ajvRowHashSchema,
  ajvRowSchemaHashSchema,
  ajvFileSchema,
} from '../plugins/index.js';

export interface ValidationError {
  instancePath: string;
  message?: string;
  keyword: string;
  params: Record<string, unknown>;
}

export interface ValidateFn {
  (data: unknown): boolean;
  errors: ValidationError[] | null;
}

const mapErrors = (
  errors: ValidateFunction['errors'],
): ValidationError[] | null => {
  if (!errors || errors.length === 0) {
    return null;
  }

  return errors.map((err) => ({
    instancePath: err.instancePath,
    message: err.message,
    keyword: err.keyword,
    params: err.params as Record<string, unknown>,
  }));
};

const wrapValidateFn = (ajvFn: ValidateFunction): ValidateFn => {
  const fn = ((data: unknown): boolean => {
    const result = ajvFn(data);
    fn.errors = mapErrors(ajvFn.errors);
    return result;
  }) as ValidateFn;

  fn.errors = null;
  return fn;
};

export class RevisiumValidator {
  public readonly validateMetaSchema: ValidateFn;
  public readonly validateJsonPatch: ValidateFn;
  public readonly validateMigrations: ValidateFn;
  public readonly validateHistoryPatches: ValidateFn;
  public readonly validateTableViews: ValidateFn;

  private readonly ajv: Ajv;
  private readonly cache = new Map<string, ValidateFn>();

  constructor() {
    this.ajv = new Ajv();

    this.ajv.addKeyword({
      keyword: 'foreignKey',
      type: 'string',
    });
    this.ajv.addKeyword({
      keyword: 'x-formula',
    });
    this.ajv.addFormat('regex', {
      type: 'string',
      validate: (str: string) => {
        try {
          new RegExp(str);
          return true;
        } catch {
          return false;
        }
      },
    });

    this.ajv.compile(ajvRowIdSchema);
    this.ajv.compile(ajvRowCreatedIdSchema);
    this.ajv.compile(ajvRowVersionIdSchema);
    this.ajv.compile(ajvRowCreatedAtSchema);
    this.ajv.compile(ajvRowPublishedAtSchema);
    this.ajv.compile(ajvRowUpdatedAtSchema);
    this.ajv.compile(ajvRowHashSchema);
    this.ajv.compile(ajvRowSchemaHashSchema);
    this.ajv.compile(ajvFileSchema);

    this.validateMetaSchema = wrapValidateFn(this.ajv.compile(metaSchema));
    this.validateJsonPatch = wrapValidateFn(this.ajv.compile(jsonPatchSchema));
    this.validateMigrations = wrapValidateFn(
      this.ajv.compile(tableMigrationsSchema),
    );
    this.validateHistoryPatches = wrapValidateFn(
      this.ajv.compile(historyPatchesSchema),
    );
    this.validateTableViews = wrapValidateFn(
      this.ajv.compile(tableViewsSchema),
    );
  }

  public compile(schema: unknown): ValidateFn {
    const key = JSON.stringify(schema);
    const cached = this.cache.get(key);

    if (cached) {
      return cached;
    }

    const fn = wrapValidateFn(
      this.ajv.compile(schema as Record<string, unknown>),
    );
    this.cache.set(key, fn);
    return fn;
  }
}
