import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-accent p-3 text-primary"><Inbox className="h-5 w-5" /></div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertCircle className="mb-2 h-5 w-5 text-red-600" />
      <h3 className="text-base font-semibold text-red-900">Something went wrong</h3>
      <p className="mt-1 text-sm text-red-700">{message || "Unable to load data."}</p>
      {onRetry && <Button variant="outline" className="mt-4 border-red-200 bg-white" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
