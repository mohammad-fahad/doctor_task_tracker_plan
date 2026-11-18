export function parsePagination(query: { page?: unknown; limit?: unknown }) {
  const pageRaw = typeof query.page === "string" ? Number(query.page) : 1;
  const limitRaw = typeof query.limit === "string" ? Number(query.limit) : 10;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limitCandidate = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 10;
  const allowed = [10, 20, 50];
  const normalizedLimit = allowed.includes(limitCandidate) ? limitCandidate : 10;
  return { page, limit: normalizedLimit, skip: (page - 1) * normalizedLimit };
}

export function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit || 1)),
  };
}
