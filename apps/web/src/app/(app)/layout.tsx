"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-auth";
import { PageLoader } from "@/components/shared/states";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (isError || !data)) {
      router.replace("/login");
    }
  }, [isLoading, isError, data, router]);

  if (isLoading) {
    return <div className="mx-auto max-w-7xl p-6"><PageLoader /></div>;
  }
  if (isError || !data) return null;
  return <>{children}</>;
}
