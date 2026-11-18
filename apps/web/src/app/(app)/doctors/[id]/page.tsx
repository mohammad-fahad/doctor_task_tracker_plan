"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { doctorApi, patientApi } from "@/lib/api-client";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

const patientSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  age: z.coerce.number().int().min(0).max(130),
  gender: z.enum(["male", "female", "other"], { required_error: "Gender is required" }),
  condition: z.string().trim().min(2, "Condition is required"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});

type PatientFormValues = z.infer<typeof patientSchema>;

function DoctorDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useMemo(() => {
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: [10, 20, 50].includes(limit) ? limit : 10,
    };
  }, [searchParams]);

  function updateParams(updates: Record<string, string | number | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, String(v));
    });
    router.replace(`${pathname}?${sp.toString()}`);
  }

  const doctorQuery = useQuery({ queryKey: ["doctor", id], queryFn: async () => (await doctorApi.get(id)).data });
  const patientsQuery = useQuery({ queryKey: ["doctor-patients", id, q], queryFn: () => doctorApi.patients(id, q) });

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { name: "", age: 0, gender: "male", condition: "", phone: "", email: "" },
  });

  const addPatient = useMutation({
    mutationFn: (values: PatientFormValues) => doctorApi.addPatient(id, { ...values, email: values.email || undefined }),
    onSuccess: async () => {
      toast.success("Patient added");
      setOpen(false);
      form.reset({ name: "", age: 0, gender: "male", condition: "", phone: "", email: "" });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["doctor-patients", id] }),
        qc.invalidateQueries({ queryKey: ["patients"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        qc.invalidateQueries({ queryKey: ["doctor", id] }),
      ]);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to add patient"),
  });

  const deletePatient = useMutation({
    mutationFn: (patientId: string) => patientApi.remove(patientId),
    onSuccess: async () => {
      toast.success("Patient deleted");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["doctor-patients", id] }),
        qc.invalidateQueries({ queryKey: ["patients"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        qc.invalidateQueries({ queryKey: ["doctor", id] }),
      ]);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to delete patient"),
  });

  const doctor = doctorQuery.data as any;
  const patients = patientsQuery.data?.data || [];
  const pagination = patientsQuery.data?.pagination;

  return (
    <AppShell
      title={doctor?.name || "Doctor details"}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild><Link href="/doctors"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset({ name: "", age: 0, gender: "male", condition: "", phone: "", email: "" }); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add patient</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add patient</DialogTitle>
                <DialogDescription>Assign a new patient to this doctor.</DialogDescription>
              </DialogHeader>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => addPatient.mutate(v))}>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Name</Label>
                  <Input {...form.register("name")} />
                  {form.formState.errors.name && <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" {...form.register("age")} />
                  {form.formState.errors.age && <p className="text-sm text-red-600">{form.formState.errors.age.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={form.watch("gender")} onValueChange={(v) => form.setValue("gender", v as any, { shouldValidate: true })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.gender && <p className="text-sm text-red-600">{form.formState.errors.gender.message}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Condition</Label>
                  <Input {...form.register("condition")} />
                  {form.formState.errors.condition && <p className="text-sm text-red-600">{form.formState.errors.condition.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input {...form.register("phone")} />
                  {form.formState.errors.phone && <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Email (optional)</Label>
                  <Input type="email" {...form.register("email")} />
                  {form.formState.errors.email && <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>}
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={addPatient.isPending}>{addPatient.isPending ? "Saving..." : "Add patient"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="space-y-6">
        {doctorQuery.isLoading ? (
          <Skeleton className="h-36 w-full" />
        ) : doctorQuery.isError ? (
          <ErrorState message={(doctorQuery.error as Error)?.message} onRetry={() => doctorQuery.refetch()} />
        ) : doctor && (
          <Card>
            <CardHeader>
              <CardTitle>{doctor.name}</CardTitle>
              <CardDescription>{doctor.specialization} · {doctor.hospital}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><div className="text-muted-foreground">Email</div><div className="font-medium">{doctor.email}</div></div>
              <div><div className="text-muted-foreground">Phone</div><div className="font-medium">{doctor.phone}</div></div>
              <div><div className="text-muted-foreground">Patients</div><div className="font-medium">{doctor.patientCount ?? "-"}</div></div>
              <div><div className="text-muted-foreground">Created</div><div className="font-medium">{formatDate(doctor.createdAt)}</div></div>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Patients</CardTitle>
            <CardDescription>Patients assigned to this doctor.</CardDescription>
          </CardHeader>
          {patientsQuery.isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : patientsQuery.isError ? (
            <div className="p-4"><ErrorState message={(patientsQuery.error as Error)?.message} onRetry={() => patientsQuery.refetch()} /></div>
          ) : patients.length === 0 ? (
            <div className="p-4 pt-0"><EmptyState title="No patients yet" description="Add a patient to this doctor to get started." action={<Button onClick={() => setOpen(true)}>Add patient</Button>} /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="hidden md:table-cell">Age/Gender</TableHead>
                    <TableHead className="hidden lg:table-cell">Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Registered</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p: any) => (
                    <TableRow key={p.id || p._id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.condition}</TableCell>
                      <TableCell className="hidden md:table-cell">{p.age} · {p.gender}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell"><div>{p.phone}</div><div>{p.email || "-"}</div></TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(p.createdAt)}</TableCell>
                      <TableCell>
                        <ConfirmDialog
                          trigger={<Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`}><Trash2 className="h-4 w-4 text-red-600" /></Button>}
                          title="Delete patient?"
                          description={`This will permanently remove ${p.name} from records.`}
                          onConfirm={() => deletePatient.mutate(p.id || p._id)}
                          disabled={deletePatient.isPending}
                        />
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
    </AppShell>
  );
}

export default function DoctorDetailPage() {
  return (
    <Suspense fallback={<AppShell title="Doctor details"><Skeleton className="h-40 w-full" /></AppShell>}>
      <DoctorDetailContent />
    </Suspense>
  );
}
