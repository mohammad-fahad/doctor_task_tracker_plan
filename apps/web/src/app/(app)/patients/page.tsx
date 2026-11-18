"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { doctorApi, patientApi } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import type { Patient } from "@/types";

const patientSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  age: z.coerce.number().int().min(0, "Age must be valid").max(130, "Age must be valid"),
  gender: z.enum(["male", "female", "other"], { required_error: "Gender is required" }),
  condition: z.string().trim().min(2, "Condition is required"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});
type PatientFormValues = z.infer<typeof patientSchema>;

function PatientFormFields({ form, doctors }: { form: any; doctors: any[] }) {
  const errors = form.formState.errors;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label>Name</Label>
        <Input {...form.register("name")} />
        {errors.name && <p className="text-sm text-red-600">{String(errors.name.message)}</p>}
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Doctor</Label>
        <Select value={form.watch("doctorId") || ""} onValueChange={(v) => form.setValue("doctorId", v, { shouldValidate: true })}>
          <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
          <SelectContent>
            {doctors.map((d: any) => (
              <SelectItem key={d.id || d._id} value={d.id || d._id}>{d.name} · {d.specialization}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.doctorId && <p className="text-sm text-red-600">{String(errors.doctorId.message)}</p>}
      </div>
      <div className="space-y-2">
        <Label>Age</Label>
        <Input type="number" {...form.register("age")} />
        {errors.age && <p className="text-sm text-red-600">{String(errors.age.message)}</p>}
      </div>
      <div className="space-y-2">
        <Label>Gender</Label>
        <Select value={form.watch("gender")} onValueChange={(v) => form.setValue("gender", v, { shouldValidate: true })}>
          <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.gender && <p className="text-sm text-red-600">{String(errors.gender.message)}</p>}
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Condition</Label>
        <Input {...form.register("condition")} />
        {errors.condition && <p className="text-sm text-red-600">{String(errors.condition.message)}</p>}
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input {...form.register("phone")} />
        {errors.phone && <p className="text-sm text-red-600">{String(errors.phone.message)}</p>}
      </div>
      <div className="space-y-2">
        <Label>Email (optional)</Label>
        <Input type="email" {...form.register("email")} />
        {errors.email && <p className="text-sm text-red-600">{String(errors.email.message)}</p>}
      </div>
    </div>
  );
}

function PatientsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(searchInput, 400);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);

  const params = useMemo(() => {
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: [10, 20, 50].includes(limit) ? limit : 10,
      search: searchParams.get("search") || undefined,
      doctorId: searchParams.get("doctorId") || undefined,
      condition: searchParams.get("condition") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      sort: (searchParams.get("sort") as "newest" | "oldest") || "newest",
    };
  }, [searchParams]);

  function updateParams(updates: Record<string, string | number | undefined | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "" || v === "all") sp.delete(k); else sp.set(k, String(v));
    });
    router.replace(`${pathname}?${sp.toString()}`);
  }

  useEffect(() => {
    const current = searchParams.get("search") || "";
    if (debouncedSearch !== current) updateParams({ search: debouncedSearch || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const listQuery = useQuery({ queryKey: ["patients", params], queryFn: () => patientApi.list(params) });
  const doctorsQuery = useQuery({ queryKey: ["doctors-for-select"], queryFn: () => doctorApi.list({ page: 1, limit: 50, sort: "newest" }) });

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { name: "", doctorId: "", age: 0, gender: "male", condition: "", phone: "", email: "" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", doctorId: "", age: 0, gender: "male", condition: "", phone: "", email: "" });
    setDialogOpen(true);
  }
  function openEdit(p: any) {
    setEditing(p);
    form.reset({ name: p.name, doctorId: p.doctorId || p.doctor?.id || "", age: p.age, gender: p.gender, condition: p.condition, phone: p.phone, email: p.email || "" });
    setDialogOpen(true);
  }

  const invalidateAll = async () => Promise.all([
    qc.invalidateQueries({ queryKey: ["patients"] }),
    qc.invalidateQueries({ queryKey: ["doctor-patients"] }),
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] }),
    qc.invalidateQueries({ queryKey: ["doctor"] }),
  ]);

  const saveMutation = useMutation({
    mutationFn: (values: PatientFormValues) => {
      const payload = { ...values, email: values.email || undefined };
      const id = editing ? ((editing as any).id || (editing as any)._id) : "";
      return editing ? patientApi.update(id, payload) : patientApi.create(payload);
    },
    onSuccess: async () => {
      toast.success(editing ? "Patient updated" : "Patient created");
      setDialogOpen(false);
      setEditing(null);
      await invalidateAll();
    },
    onError: 
