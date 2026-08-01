import { EntityValidator, ValidationResult } from './index';
import { ParsedRow } from '../import-engine';

const HEADER_MAP: Record<string, string> = {
  'first name': 'firstName',
  first_name: 'firstName',
  firstname: 'firstName',
  'last name': 'lastName',
  last_name: 'lastName',
  lastname: 'lastName',
  email: 'email',
  'e-mail': 'email',
  phone: 'phone',
  mobile: 'phone',
  password: 'password',
  role: 'roleSlug',
  'role slug': 'roleSlug',
  role_slug: 'roleSlug',
  branch: 'branchId',
  'branch code': 'branchId',
  branch_code: 'branchId',
};

export class UserValidator implements EntityValidator {
  entityType = 'users';

  requiredFields(): string[] {
    return ['firstName', 'lastName', 'email'];
  }

  autoMapHeaders(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    for (const h of headers) {
      const key = h.toLowerCase().trim().replace(/\s+/g, ' ');
      if (HEADER_MAP[key]) {
        mapping[h] = HEADER_MAP[key];
      } else {
        mapping[h] = h.replace(/\s+/g, '_').toLowerCase();
      }
    }
    return mapping;
  }

  async validate(
    row: ParsedRow,
    _tenantId: string,
    _branchId?: string,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const fields = row.data;

    if (!fields.firstName && !fields.first_name)
      errors.push('First name is required');
    if (!fields.lastName && !fields.last_name)
      errors.push('Last name is required');
    if (!fields.email) errors.push('Email is required');

    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      errors.push('Invalid email format');
    }

    if (fields.phone && !/^[\d\-+\s()]{7,20}$/.test(fields.phone)) {
      errors.push('Invalid phone number format');
    }

    return { row, valid: errors.length === 0, errors };
  }
}
