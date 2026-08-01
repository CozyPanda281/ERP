import { PaginationMeta } from './pagination.helper';

export class ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: unknown;
  pagination?: PaginationMeta;
  timestamp: string;

  private constructor(
    success: boolean,
    message: string,
    data?: T,
    error?: string,
    errors?: unknown,
    pagination?: PaginationMeta,
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.errors = errors;
    this.pagination = pagination;
    this.timestamp = new Date().toISOString();
  }

  static ok<T>(data?: T, message = 'Success'): ApiResponse<T> {
    return new ApiResponse<T>(true, message, data);
  }

  static created<T>(
    data?: T,
    message = 'Created successfully',
  ): ApiResponse<T> {
    return new ApiResponse<T>(true, message, data);
  }

  static paginated<T>(
    data: T[],
    pagination: PaginationMeta,
    message = 'Success',
  ): ApiResponse<T[]> {
    const response = new ApiResponse<T[]>(true, message, data);
    response.pagination = pagination;
    return response;
  }

  static error(
    message = 'Internal server error',
    error?: string,
  ): ApiResponse<never> {
    return new ApiResponse<never>(false, message, undefined, error);
  }

  static validationError(message: string, errors: unknown): ApiResponse<never> {
    return new ApiResponse<never>(false, message, undefined, undefined, errors);
  }
}

export function ok<T>(data?: T, message = 'Success') {
  return ApiResponse.ok(data, message);
}

export function created<T>(data?: T, message = 'Created successfully') {
  return ApiResponse.created(data, message);
}

export function paginated<T>(
  data: T[],
  pagination: PaginationMeta,
  message = 'Success',
) {
  return ApiResponse.paginated(data, pagination, message);
}
