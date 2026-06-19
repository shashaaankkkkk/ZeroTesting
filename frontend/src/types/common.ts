/* Common types */
export interface PaginatedResponse<T> {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  error: boolean;
  status_code: number;
  message: string;
  details: Record<string, unknown>;
}
