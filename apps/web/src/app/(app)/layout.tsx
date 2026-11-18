"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-auth";
import { PageLoader } from "@/components/shared/states";
import { resolveSessionGate } from "@/lib/session-gate";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isFetching, isError } = useMe();
  const router = useRouter();
  const gate = resolveSessionGate({
    isLoading,
    isFetching,
    isError,
    hasUser: Boolean(data),
  });

  useEffect(() => {
    if (gate === "redirect") {
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [gate, router]);

  if (gate === "loading") {
    return <div className="mx-auto max-w-7xl p-6"><PageLoader /></div>;
  }
  if (gate === "redirect") return null;
  return <>{children}</>;
}
