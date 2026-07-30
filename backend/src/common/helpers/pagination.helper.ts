export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function parsePagination(query: {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: string;
}): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(query.limit || '20'), 10) || 20),
  );
  const sortBy = query.sortBy;
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  return { page, limit, sortBy, sortOrder };
}

export function buildPaginationMeta(
  total: number,
  params: PaginationParams,
): PaginationMeta {
  const totalPages = Math.ceil(total / params.limit);

  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPreviousPage: params.page > 1,
  };
}

export function paginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams,
) {
  return {
    data,
    pagination: buildPaginationMeta(total, params),
  };
}

export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}
