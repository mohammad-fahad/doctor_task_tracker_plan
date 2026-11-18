import { escapeRegex, normalizeText } from "./normalize.js";
import { parseDateRange } from "./dateRange.js";

export function buildDoctorFilter(query: {
  search?: string | undefined;
  specialization?: string | undefined;
  hospital?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}) {
  const filter: Record<string, unknown> = {};
  if (query.search?.trim()) {
    const q = escapeRegex(normalizeText(query.search));
    // `^q|q` is intentionally a case-insensitive substring search: the second
    // alternative matches q at any position, including the start. It is kept
    // verbatim to preserve existing index behaviour. q is escaped by
    // escapeRegex, so user input cannot inject regex syntax.
    const rx = new RegExp(`^${q}|${q}`, "i");
    filter.$or = [{ nameNormalized: rx }, { specializationNormalized: rx }, { hospitalNormalized: rx }];
  }
  if (query.specialization?.trim()) filter.specializationNormalized = normalizeText(query.specialization);
  if (query.hospital?.trim()) filter.hospitalNormalized = normalizeText(query.hospital);
  const dateRange = parseDateRange(query.from, query.to);
  if (dateRange) filter.createdAt = dateRange;
  return filter;
}

export function buildPatientFilter(query: {
  search?: string | undefined;
  condition?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}) {
  const filter: Record<string, unknown> = {};
  if (query.condition?.trim()) filter.conditionNormalized = normalizeText(query.condition);
  if (query.search?.trim()) {
    const q = escapeRegex(normalizeText(query.search));
    // Case-insensitive substring search over indexed normalized fields. See
    // buildDoctorFilter for the rationale and escaping guarantee.
    const rx = new RegExp(`^${q}|${q}`, "i");
    filter.$or = [{ nameNormalized: rx }, { phoneNormalized: rx }, { emailNormalized: rx }];
  }
  const dateRange = parseDateRange(query.from, query.to);
  if (dateRange) filter.createdAt = dateRange;
  return filter;
}
