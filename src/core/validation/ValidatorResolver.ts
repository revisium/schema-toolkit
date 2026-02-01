import type { Validator, ValidationContext } from './types.js';
import type { ValidatorRegistry } from './ValidatorRegistry.js';

export class ValidatorResolver {
  constructor(private readonly registry: ValidatorRegistry) {}

  resolve(context: ValidationContext): Validator[] {
    const validators: Validator[] = [];
    const rules = this.registry.getRules();

    for (const rule of rules) {
      if (rule.shouldApply(context)) {
        const validator = this.registry.get(rule.validatorType);
        if (validator) {
          validators.push(validator);
        }
      }
    }

    return validators;
  }
}
