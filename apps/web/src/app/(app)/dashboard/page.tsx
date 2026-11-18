"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { dashboardApi } from "@/lib/api-client";
import { ErrorState, EmptyState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { RegistrationsChart } from "@/components/charts/registrations-chart";
import { PatientsPerDoctorChart } from "@/components/charts/patients-per-doctor-chart";
import { Users, Stethoscope, UserPlus } from "lucide-react";

export default function DashboardPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<{ from?: string; to?: string }>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-summary", applied],
    queryFn: async () => (await dashboardApi.summary(applied)).data,
  });

  const hasPeriod = !!(applied.from || applied.to);

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Total doctors", value: data.totals.totalDoctors, icon: Stethoscope, note: "All-time" },
      { label: "Total patients", value: data.totals.totalPatients, icon: Users, note: "All-time" },
      { label: hasPeriod ? "New patients (period)" : "New patients (all time)", value: data.period.newPatients, icon: UserPlus, note: hasPeriod ? "Date-filtered" : "All-time" },
    ];
  }, [data, hasPeriod]);

  return (
    <AppShell
      title="Dashboard"
      actions={
        <div className="hidden items-end gap-2 lg:flex">
          <div>
            <Label htmlFor="from" className="sr-only">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <div>
            <Label htmlFor="to" className="sr-only">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <Button size="sm" variant="outline" onClick={() => setApplied({ from: from || undefined, to: to || undefined })}>Apply</Button>
          {(from || to || applied.from || applied.to) && (
            <Button size="sm" variant="ghost" onClick={() => { setFrom(""); setTo(""); setApplied({}); }}>Clear</Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-3 rounded-xl border bg-white p-4 lg:hidden">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="m-from">From</Label><Input id="m-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label htmlFor="m-to">To</Label><Input id="m-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setApplied({ from: from || undefined, to: to || undefined })}>Apply range</Button>
            <Button size="sm" variant="outline" onClick={() => { setFrom(""); setTo(""); setApplied({}); }}>Clear</Button>
          </div>
        </div>

        {isError ? (
          <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading || !data
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
                : stats.map((s) => {
                    const Icon = s.icon;
                    return (
                      <Card key={s.label}>
                        <CardContent className="flex items-center justify-between p-6">
                          <div>
                            <p className="text-sm text-muted-foreground">{s.label}</p>
                            <p className="mt-2 text-3xl font-semibold tracking-tight">{s.value}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
                          </div>
                          <div className="rounded-full bg-accent p-3 text-primary"><Icon className="h-5 w-5" /></div>
                        </CardContent>
                      </Card>
                    );
                  })}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Patient registrations over time</CardTitle>
                  <CardDescription>{hasPeriod ? "Registrations in selected period" : "All-time registration trend"}</CardDescription>
                </CardHeader>
                <CardContent className="h-[340px]">
                  {isLoading ? <Skeleton className="h-full w-full" /> : data && data.registrationsOverTime.length ? (
                    <RegistrationsChart data={data.registrationsOverTime} />
                  ) : (
                    <EmptyState title="No registration data" description="Patient registrations will appear here once data is available." />
                  )}
                </CardContent>
              </Card>

              <Card className="min-w-0">
                <CardHeader>
                  <CardTitle>Patients per doctor</CardTitle>
                  <CardDescription>{hasPeriod ? "Patient counts for selected period" : "Top doctors by assigned patients"}</CardDescription>
                </CardHeader>
                <CardContent className="h-[340px]">
                  {isLoading ? <Skeleton className="h-full w-full" /> : data && data.patientsPerDoctor.length ? (
                    <PatientsPerDoctorChart data={data.patientsPerDoctor} />
                  ) : (
                    <EmptyState title="No doctor data" description="Doctor patient distribution will appear here once data is available." />
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
