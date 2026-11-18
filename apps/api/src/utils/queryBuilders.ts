import { escapeRegex, normalizeText } from "./normalize.js";
import { parseDateRange } from "./dateRange.js";

export function buildDoctorFilter(query: { search?: string; specialization?: string; hospital?: string; from?: string; to?: string }) {
  const filter: Record<string, unknown> = {};
  if (query.search?.trim()) {
    const q = escapeRegex(normalizeText(query.search));
    const rx = new RegExp(`^${q}|${q}`, "i");
    filter.$or = [{ nameNormalized: rx }, { specializationNormalized: rx }, { hospitalNormalized: rx }];
  }
  if (query.specialization?.trim()) filter.specializationNormalized = normalizeText(query.specialization);
  if (query.hospital?.trim()) filter.hospitalNormalized = normalizeText(query.hospital);
  const dateRange = parseDateRange(query.from, query.to);
  if (dateRange) filter.createdAt = dateRange;
  return filter;
}

export function buildPatientFilter(query: { search?: string; condition?: string; from?: string; to?: string }) {
  const filter: Record<string, unknown> = {};
  if (query.condition?.trim()) filter.conditionNormalized = normalizeText(query.condition);
  if (query.search?.trim()) {
    const q = escapeRegex(normalizeText(query.search));
    const rx = new RegExp(`^${q}|${q}`, "i");
    filter.$or = [{ nameNormalized: rx }, { phoneNormalized: rx }, { emailNormalized: rx }];
  }
  const dateRange = parseDateRange(query.from, query.to);
  if (dateRange) filter.createdAt = dateRange;
  return filter;
}
