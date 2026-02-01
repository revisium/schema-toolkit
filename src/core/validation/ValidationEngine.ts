import type { Diagnostic, ValidationContext } from './types.js';
import type { ValidatorResolver } from './ValidatorResolver.js';

export class ValidationEngine {
  constructor(private readonly resolver: ValidatorResolver) {}

  validate(context: ValidationContext): readonly Diagnostic[] {
    const validators = this.resolver.resolve(context);
    const diagnostics: Diagnostic[] = [];

    for (const validator of validators) {
      const diagnostic = validator.validate(context);
      if (diagnostic) {
        diagnostics.push(diagnostic);
      }
    }

    return diagnostics;
  }
}
