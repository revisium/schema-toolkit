interface XFormulaInput {
  version: number;
  expression: string;
}

interface SchemaProperty {
  type?: string;
  'x-formula'?: XFormulaInput;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  [key: string]: unknown;
}

interface JsonSchemaInput {
  type?: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  [key: string]: unknown;
}

export interface ExtractedFormula {
  fieldName: string;
  expression: string;
  fieldType: string;
}

export function extractSchemaFormulas(
  schema: JsonSchemaInput,
): ExtractedFormula[] {
  const formulas: ExtractedFormula[] = [];
  extractFormulasRecursive(schema, '', formulas);
  return formulas;
}

function extractFormulasRecursive(
  schema: SchemaProperty | JsonSchemaInput,
  pathPrefix: string,
  formulas: ExtractedFormula[],
): void {
  if (schema.type === 'array' && schema.items) {
    extractFormulasRecursive(schema.items, `${pathPrefix}[]`, formulas);
    return;
  }

  const properties = schema.properties ?? {};

  for (const [fieldName, fieldSchema] of Object.entries(properties)) {
    const fullPath = pathPrefix ? `${pathPrefix}.${fieldName}` : fieldName;

    const xFormula = fieldSchema['x-formula'];
    if (xFormula) {
      formulas.push({
        fieldName: fullPath,
        expression: xFormula.expression,
        fieldType: fieldSchema.type ?? 'string',
      });
    }

    if (fieldSchema.type === 'object' && fieldSchema.properties) {
      extractFormulasRecursive(fieldSchema, fullPath, formulas);
    }

    if (fieldSchema.type === 'array' && fieldSchema.items) {
      extractFormulasRecursive(fieldSchema.items, `${fullPath}[]`, formulas);
    }
  }
}
