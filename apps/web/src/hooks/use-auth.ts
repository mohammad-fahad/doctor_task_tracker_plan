"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api-client";
import { ApiClientError } from "@/lib/api";
import { useRouter } from "next/navigation";

export const meQueryKey = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async () => {
      const res = await authApi.me();
      return res.data.user;
    },
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: () => {
      qc.removeQueries({ queryKey: meQueryKey });
      router.push("/dashboard");
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      qc.clear();
      router.push("/login");
      router.refresh();
    },
  });
}

export function isUnauthorized(err: unknown) {
  return err instanceof ApiClientError && err.status === 401;
}
