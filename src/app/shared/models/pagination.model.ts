/**
 * Generic pagination response from backend.
 * Matches Spring Data Page<T> structure.
 *
 * Usage:
 * ```typescript
 * getBooks(page: number): Observable<PageResponse<Book>> {
 *   return this.http.get<PageResponse<Book>>(`/api/books?page=${page}`);
 * }
 * ```
 */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // Current page number (0-indexed)
  size: number; // Page size
  first: boolean;
  last: boolean;
  empty: boolean;
  numberOfElements: number; // Elements in current page
}

/**
 * Pagination request parameters.
 * Use this to build query params for paginated endpoints.
 */
export interface PageRequest {
  page: number;
  size: number;
  sort?: string; // e.g., "name,asc" or "createdDate,desc"
}

/**
 * Simple pagination metadata (for components that don't use Spring Page)
 */
export interface PaginationMeta {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Adapter for pagination data.
 * Converts backend pagination to PaginationMeta.
 */
export class PaginationAdapter {
  /**
   * Adapt Spring Data Page response to PaginationMeta
   */
  static adapt<T>(pageResponse: PageResponse<T>): PaginationMeta {
    return {
      currentPage: pageResponse.number,
      pageSize: pageResponse.size,
      totalPages: pageResponse.totalPages,
      totalElements: pageResponse.totalElements,
      hasNext: !pageResponse.last,
      hasPrevious: !pageResponse.first,
    };
  }

  /**
   * Create empty pagination meta (for initial state)
   */
  static empty(): PaginationMeta {
    return {
      currentPage: 0,
      pageSize: 10,
      totalPages: 0,
      totalElements: 0,
      hasNext: false,
      hasPrevious: false,
    };
  }
}
