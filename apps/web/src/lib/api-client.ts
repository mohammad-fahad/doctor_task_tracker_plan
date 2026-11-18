import { apiFetch } from "./api";
import type { ApiResponse, DashboardSummary, Doctor, PaginatedResponse, Patient, User } from "@/types";

export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiFetch<ApiResponse<{ user: User }>>("/auth/login", { method: "POST", json: data }),
  logout: () => apiFetch<ApiResponse<null> | { success: boolean; message?: string }>("/auth/logout", { method: "POST" }),
  me: () => apiFetch<ApiResponse<{ user: User }>>("/auth/me"),
};

export const doctorApi = {
  list: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return apiFetch<PaginatedResponse<Doctor>>(`/doctors${qs.toString() ? `?${qs}` : ""}`);
  },
  options: () => apiFetch<ApiResponse<{ specializations: string[]; hospitals: string[] }>>("/doctors/filters/options"),
  create: (data: Partial<Doctor>) => apiFetch<ApiResponse<Doctor>>("/doctors", { method: "POST", json: data }),
  get: (id: string) => apiFetch<ApiResponse<Doctor>>(`/doctors/${id}`),
  patients: (id: string, params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return apiFetch<PaginatedResponse<Patient>>(`/doctors/${id}/patients${qs.toString() ? `?${qs}` : ""}`);
  },
  addPatient: (id: string, data: Partial<Patient>) => apiFetch<ApiResponse<Patient>>(`/doctors/${id}/patients`, { method: "POST", json: data }),
};

export const patientApi = {
  list: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return apiFetch<PaginatedResponse<Patient>>(`/patients${qs.toString() ? `?${qs}` : ""}`);
  },
  create: (data: Partial<Patient>) => apiFetch<ApiResponse<Patient>>("/patients", { method: "POST", json: data }),
  get: (id: string) => apiFetch<ApiResponse<Patient>>(`/patients/${id}`),
  update: (id: string, data: Partial<Patient>) => apiFetch<ApiResponse<Patient>>(`/patients/${id}`, { method: "PATCH", json: data }),
  remove: (id: string) => apiFetch<{ success: boolean; message?: string }>(`/patients/${id}`, { method: "DELETE" }),
};

export const dashboardApi = {
  summary: (params: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    return apiFetch<ApiResponse<DashboardSummary>>(`/dashboard/summary${qs.toString() ? `?${qs}` : ""}`);
  },
};
