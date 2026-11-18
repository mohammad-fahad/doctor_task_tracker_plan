"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { doctorApi } from "@/lib/api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

const doctorSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  specialization: z.string().trim().min(2, "Specialization is required"),
  hospital: z.string().trim().min(2, "Hospital is required"),
  phone: z.string().trim().min(7, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email"),
});

type DoctorFormValues = z.infer<typeof doctorSchema>;

function DoctorsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(searchInput, 400);

  const params = useMemo(() => {
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit: [10, 20, 50].includes(limit) ? limit : 10,
      search: searchParams.get("search") || undefined,
      specialization: searchParams.get("specialization") || undefined,
      hospital: searchParams.get("hospital") || undefined,
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
    if (!sp.get("page")) sp.set("page", "1");
    router.replace(`${pathname}?${sp.toString()}`);
  }

  useEffect(() => {
    const current = searchParams.get("search") || "";
    if (debouncedSearch !== current) {
      updateParams({ search: debouncedSearch || undefined, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const listQuery = useQuery({ queryKey: ["doctors", params], queryFn: () => doctorApi.list(params) });
  const optionsQuery = useQuery({ queryKey: ["doctor-options"], queryFn: async () => (await doctorApi.options()).data });

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { name: "", specialization: "", hospital: "", phone: "", email: "" },
  });

  const createMutation = useMutation({
    mutationFn: doctorApi.create,
    onSuccess: async () => {
      toast.success("Doctor created");
      setOpen(false);
      form.reset();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["doctors"] }),
        qc.invalidateQueries({ queryKey: ["doctor-options"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create doctor"),
  });

  const doctors = listQuery.data?.data || [];
  const pagination = listQuery.data?.pagination;

  return (
    <AppShell
      title="Doctors"
      actions={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" />Add doctor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add doctor</DialogTitle>
              <DialogDescription>Create a new doctor profile.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" {...form.register("name")} />
                  {form.formState.errors.name && <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input id="specialization" {...form.register("specialization")} />
                  {form.formState.errors.specialization && <p className="text-sm text-red-600">{form.formState.errors.specialization.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospital">Hospital</Label>
                  <Input id="hospital" {...form.register("hospital")} />
                  {form.formState.errors.hospital && <p className="text-sm text-red-600">{form.formState.errors.hospital.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...form.register("phone")} />
                  {form.formState.errors.phone && <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                  {form.formState.errors.email && <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Saving..." : "Create doctor"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="xl:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="search" className="pl-9" placeholder="Name, specialization, hospital" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Specialization</Label>
              <Select value={params.specialization || "all"} onValueChange={(v) => updateParams({ specialization: v === "all" ? undefined : v, page: 1 })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All specializations</SelectItem>
                  {(optionsQuery.data?.specializations || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hospital</Label>
              <Select value={params.hospital || "all"} onValueChange={(v) => updateParams({ hospital: v === "all" ? undefined : v, page: 1 })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All hospitals</SelectItem>
                  {(optionsQuery.data?.hospitals || []).map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" className="mt-1" value={params.from || ""} onChange={(e) => updateParams({ from: e.target.value || undefined, page: 1 })} />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" className="mt-1" value={params.to || ""} onChange={(e) => updateParams({ to: e.target.value || undefined, page: 1 })} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          {listQuery.isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : listQuery.isError ? (
            <div className="p-4"><ErrorState message={(listQuery.error as Error)?.message} onRetry={() => listQuery.refetch()} /></div>
          ) : doctors.length === 0 ? (
            <div className="p-4"><EmptyState title="No doctors found" description="Try adjusting filters or add a new doctor." action={<Button onClick={() => setOpen(true)}>Add doctor</Button>} /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Hospital</TableHead>
                    <TableHead className="hidden lg:table-cell">Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map((d: any) => (
                    <TableRow key={d.id || d._id}>
                      <TableCell className="font-medium">
                        <Link href={`/doctors/${d.id || d._id}`} className="text-primary hover:underline">{d.name}</Link>
                      </TableCell>
                      <TableCell>{d.specialization}</TableCell>
                      <TableCell>{d.hospital}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        <div>{d.email}</div><div>{d.phone}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{formatDate(d.createdAt)}</TableCell>
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
                  onPageChange={(p) => updateParams({ page: p })}
                  onLimitChange={(l) => updateParams({ limit: l, page: 1 })}
                />
              )}
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense fallback={<AppShell title="Doctors"><div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div></AppShell>}>
      <DoctorsContent />
    </Suspense>
  );
}
