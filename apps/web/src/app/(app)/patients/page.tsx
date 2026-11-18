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
      if (v === undefined || v === null || v === "" || v === "all") sp.delete(k);
      else sp.set(k, String(v));
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
    form.reset({
      name: p.name,
      doctorId: p.doctorId || p.doctor?.id || "",
      age: p.age,
      gender: p.gender,
      condition: p.condition,
      phone: p.phone,
      email: p.email || "",
    });
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
    onError: (e: any) => toast.error(e?.message || "Failed to save patient"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => patientApi.remove(id),
    onSuccess: async () => {
      toast.success("Patient deleted");
      await invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete patient"),
  });

  const patients = listQuery.data?.data || [];
  const pagination = listQuery.data?.pagination;
  const doctors = doctorsQuery.data?.data || [];

  return (
    <AppShell title="Patients" actions={<Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add patient</Button>}>
      <div className="space-y-4">
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-7">
            <div className="xl:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="search" className="pl-9" placeholder="Name, phone, email" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Doctor</Label>
              <Select value={params.doctorId || "all"} onValueChange={(v) => updateParams({ doctorId: v, page: 1 })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All doctors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All doctors</SelectItem>
                  {doctors.map((d: any) => <SelectItem key={d.id || d._id} value={d.id || d._id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Input id="condition" className="mt-1" placeholder="e.g. Asthma" value={params.condition || ""} onChange={(e) => updateParams({ condition: e.target.value || undefined, page: 1 })} />
            </div>
            <div>
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" className="mt-1" value={params.from || ""} onChange={(e) => updateParams({ from: e.target.value || undefined, page: 1 })} />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" className="mt-1" value={params.to || ""} onChange={(e) => updateParams({ to: e.target.value || undefined, page: 1 })} />
            </div>
            <div>
              <Label>Sort</Label>
              <Select value={params.sort} onValueChange={(v) => updateParams({ sort: v, page: 1 })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          {listQuery.isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : listQuery.isError ? (
            <div className="p-4"><ErrorState message={(listQuery.error as Error)?.message} onRetry={() => listQuery.refetch()} /></div>
          ) : patients.length === 0 ? (
            <div className="p-4"><EmptyState title="No patients found" description="Try adjusting filters or add a new patient." action={<Button onClick={openCreate}>Add patient</Button>} /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="hidden md:table-cell">Age/Gender</TableHead>
                    <TableHead className="hidden lg:table-cell">Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Registered</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p: any) => (
                    <TableRow key={p.id || p._id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.doctor?.name || "-"}</TableCell>
                      <TableCell>{p.condition}</TableCell>
                      <TableCell className="hidden md:table-cell">{p.age} · {p.gender}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell"><div>{p.phone}</div><div>{p.email || "-"}</div></TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(p.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`} onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <ConfirmDialog
                            trigger={<Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`}><Trash2 className="h-4 w-4 text-red-600" /></Button>}
                            title="Delete patient?"
                            description={`This will permanently remove ${p.name} from records.`}
                            onConfirm={() => deleteMutation.mutate(p.id || p._id)}
                            disabled={deleteMutation.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination && (
                <PaginationControls
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPageChange={(page) => updateParams({ page })}
                  onLimitChange={(limit) => updateParams({ limit, page: 1 })}
                />
              )}
            </>
          )}
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit patient" : "Add patient"}</DialogTitle>
            <DialogDescription>{editing ? "Update patient information." : "Create a new patient record."}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
            <PatientFormFields form={form} doctors={doctors} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editing ? "Save changes" : "Create patient"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<AppShell title="Patients"><div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div></AppShell>}>
      <PatientsContent />
    </Suspense>
  );
}
