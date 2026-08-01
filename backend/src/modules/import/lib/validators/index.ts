import { ParsedRow } from '../import-engine';

export interface ValidationResult {
  row: ParsedRow;
  valid: boolean;
  errors: string[];
}

export interface EntityValidator {
  entityType: string;
  validate(
    row: ParsedRow,
    tenantId: string,
    branchId?: string,
  ): Promise<ValidationResult>;
  requiredFields(): string[];
  autoMapHeaders(headers: string[]): Record<string, string>;
}

import { StudentValidator } from './student.validator';
import { UserValidator } from './user.validator';

const validators: Map<string, EntityValidator> = new Map();

export function registerValidator(v: EntityValidator) {
  validators.set(v.entityType, v);
}

export function getValidator(entityType: string): EntityValidator {
  const v = validators.get(entityType);
  if (!v)
    throw new Error(`No validator registered for entity type: ${entityType}`);
  return v;
}

export function listEntityTypes(): {
  entityType: string;
  requiredFields: string[];
}[] {
  return Array.from(validators.values()).map((v) => ({
    entityType: v.entityType,
    requiredFields: v.requiredFields(),
  }));
}

registerValidator(new StudentValidator());
registerValidator(new UserValidator());
