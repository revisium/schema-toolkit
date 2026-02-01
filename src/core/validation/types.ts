export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly type: string;
  readonly message: string;
  readonly path: string;
  readonly params?: Record<string, unknown>;
}

export interface SchemaLike {
  readonly type?: string;
  readonly required?: boolean;
  readonly pattern?: string;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly enum?: readonly (string | number)[];
  readonly foreignKey?: string;
  readonly [key: string]: unknown;
}

export interface ValidationContext {
  readonly value: unknown;
  readonly schema: SchemaLike;
  readonly nodeName: string;
}

export interface Validator {
  readonly type: string;
  validate(context: ValidationContext): Diagnostic | null;
}

export interface ValidatorRule {
  readonly validatorType: string;
  shouldApply(context: ValidationContext): boolean;
}

export type ValidatorFactoryFn = () => Validator;
