export type User = { id: string; email: string; role: string };
export type Doctor = {
  _id?: string;
  id?: string;
  name: string;
  specialization: string;
  hospital: string;
  phone: string;
  email: string;
  createdAt?: string;
  patientCount?: number;
};
export type Patient = {
  _id?: string;
  id?: string;
  name: string;
  doctorId: string;
  doctor?: { id: string; name: string; specialization: string; hospital: string } | null;
  age: number;
  gender: "male" | "female" | "other";
  condition: string;
  phone: string;
  email?: string;
  createdAt?: string;
};
export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type PaginatedResponse<T> = { success: boolean; data: T[]; pagination: Pagination };
export type ApiResponse<T> = { success: boolean; data: T; message?: string };
export type DashboardSummary = {
  totals: { totalDoctors: number; totalPatients: number };
  period: { from: string | null; to: string | null; newPatients: number };
  patientsPerDoctor: { doctorId: string; doctorName: string; patientCount: number }[];
  registrationsOverTime: { date: string; count: number }[];
};
