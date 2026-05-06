export interface Pagination {
  count?: number;
  offset?: number;
}

export const PAGINATION_DEFAULT_COUNT = 10;
export const PAGINATION_DEFAULT_OFFSET = 0;

export const buildPaginationOptions = (paginationOptions?: Pagination) => {
  return {
    count: paginationOptions?.count ?? PAGINATION_DEFAULT_COUNT,
    offset: paginationOptions?.offset ?? PAGINATION_DEFAULT_OFFSET,
  };
};
