"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Stethoscope, Users, Menu, X, LogOut, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLogout, useMe } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/doctors", label: "Doctors", icon: Stethoscope },
  { href: "/patients", label: "Patients", icon: Users },
];

export function AppShell({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: me } = useMe();
  const logout = useLogout();

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-[#efece5] hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r bg-[#fbfaf7] p-4 md:flex md:flex-col">
          <div className="mb-8 px-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Doctor Tracker</div>
            <div className="mt-1 text-sm text-muted-foreground">Clinical Administration</div>
          </div>
          <NavLinks />
          <div className="mt-auto rounded-lg border bg-white p-3 text-xs text-muted-foreground">
            Manage doctors, patients, and operational insights in one workspace.
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h1>
              </div>
              {actions}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <UserCircle2 className="h-4 w-4" />
                    <span className="hidden max-w-[160px] truncate sm:inline">{me?.email || "Admin"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="text-sm font-medium">Administrator</div>
                    <div className="text-xs text-muted-foreground">{me?.email || ""}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout.mutate()} disabled={logout.isPending}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {open && (
            <div className="fixed inset-0 z-40 md:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
              <div className="absolute inset-y-0 left-0 w-72 border-r bg-[#fbfaf7] p-4 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Doctor Tracker</div>
                    <div className="mt-1 text-sm text-muted-foreground">Clinical Administration</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></Button>
                </div>
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
            </div>
          )}

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
