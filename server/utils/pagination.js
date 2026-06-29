export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  return { page, limit, skip: (page - 1) * limit };
}
export const paginationMeta = (page, limit, total) => ({
  page, limit, total, pages: Math.ceil(total / limit) || 1,
});
