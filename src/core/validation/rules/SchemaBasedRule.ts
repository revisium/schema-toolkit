import type { ValidatorRule, ValidationContext, SchemaLike } from '../types.js';

export class SchemaPropertyRule implements ValidatorRule {
  constructor(
    readonly validatorType: string,
    private readonly propertyName: keyof SchemaLike,
  ) {}

  shouldApply(context: ValidationContext): boolean {
    const value = context.schema[this.propertyName];
    return value !== undefined && value !== null;
  }
}

export class SchemaTruthyRule implements ValidatorRule {
  constructor(
    readonly validatorType: string,
    private readonly propertyName: keyof SchemaLike,
  ) {}

  shouldApply(context: ValidationContext): boolean {
    return context.schema[this.propertyName] === true;
  }
}

export class CompositeRule implements ValidatorRule {
  constructor(
    readonly validatorType: string,
    private readonly conditions: Array<(context: ValidationContext) => boolean>,
  ) {}

  shouldApply(context: ValidationContext): boolean {
    return this.conditions.every((condition) => condition(context));
  }
}
