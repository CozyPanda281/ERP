import { EntityValidator, ValidationResult } from './index';
import { ParsedRow } from '../import-engine';

const HEADER_MAP: Record<string, string> = {
  'first name': 'firstName',
  'first_name': 'firstName',
  'firstname': 'firstName',
  'last name': 'lastName',
  'last_name': 'lastName',
  'lastname': 'lastName',
  'date of birth': 'dateOfBirth',
  'date_of_birth': 'dateOfBirth',
  'dob': 'dateOfBirth',
  'gender': 'gender',
  'blood group': 'bloodGroup',
  'blood_group': 'bloodGroup',
  'admission number': 'admissionNumber',
  'admission_number': 'admissionNumber',
  'roll number': 'rollNumber',
  'roll_number': 'rollNumber',
  'phone': 'phone',
  'mobile': 'phone',
  'email': 'email',
  'address': 'address',
  'city': 'city',
  'state': 'state',
  'pincode': 'pincode',
  'nationality': 'nationality',
  'religion': 'religion',
  'caste': 'caste',
  'category': 'category',
  'father name': 'fatherName',
  'father_name': 'fatherName',
  'father phone': 'fatherPhone',
  'father_phone': 'fatherPhone',
  'mother name': 'motherName',
  'mother_name': 'motherName',
  'mother phone': 'motherPhone',
  'mother_phone': 'motherPhone',
  'guardian name': 'guardianName',
  'guardian_name': 'guardianName',
  'guardian phone': 'guardianPhone',
  'guardian_phone': 'guardianPhone',
  'previous school': 'previousSchool',
  'previous_school': 'previousSchool',
  'class': 'classId',
  'class name': 'classId',
  'class_name': 'classId',
  'section': 'sectionId',
  'academic year': 'academicYearId',
  'academic_year': 'academicYearId',
};

export class StudentValidator implements EntityValidator {
  entityType = 'students';

  requiredFields(): string[] {
    return ['firstName', 'lastName'];
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

  async validate(row: ParsedRow, _tenantId: string, _branchId?: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const fields = row.data;

    if (!fields.firstName && !fields.first_name) {
      errors.push('First name is required');
    }
    if (!fields.lastName && !fields.last_name) {
      errors.push('Last name is required');
    }

    if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      errors.push('Invalid email format');
    }

    if (fields.dateOfBirth && isNaN(Date.parse(fields.dateOfBirth)) && fields.date_of_birth && isNaN(Date.parse(fields.date_of_birth))) {
      errors.push('Invalid date of birth format (use YYYY-MM-DD)');
    }

    if (fields.gender && !['male', 'female', 'other'].includes(fields.gender.toLowerCase())) {
      errors.push('Gender must be Male, Female, or Other');
    }

    return { row, valid: errors.length === 0, errors };
  }
}
