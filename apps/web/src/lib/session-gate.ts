type SessionState = {
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  hasUser: boolean;
};

export type SessionGate = "loading" | "redirect" | "ready";

export function resolveSessionGate({ isLoading, isFetching, isError, hasUser }: SessionState): SessionGate {
  if (isLoading || (isFetching && !hasUser)) return "loading";
  if (isError || !hasUser) return "redirect";
  return "ready";
}
