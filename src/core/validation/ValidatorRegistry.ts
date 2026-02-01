import type { Validator, ValidatorFactoryFn, ValidatorRule } from './types.js';

export class ValidatorRegistry {
  private readonly validators = new Map<string, ValidatorFactoryFn>();
  private readonly rules: ValidatorRule[] = [];

  register(type: string, factory: ValidatorFactoryFn): this {
    this.validators.set(type, factory);
    return this;
  }

  addRule(rule: ValidatorRule): this {
    this.rules.push(rule);
    return this;
  }

  get(type: string): Validator | undefined {
    const factory = this.validators.get(type);
    return factory ? factory() : undefined;
  }

  has(type: string): boolean {
    return this.validators.has(type);
  }

  getRules(): readonly ValidatorRule[] {
    return this.rules;
  }

  getValidatorTypes(): string[] {
    return Array.from(this.validators.keys());
  }
}
