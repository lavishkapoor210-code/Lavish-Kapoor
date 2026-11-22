import type { ApprovalState, ProjectStatus } from "@/lib/types";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted/20 text-muted",
  script: "bg-blue-500/20 text-blue-300",
  storyboard: "bg-indigo-500/20 text-indigo-300",
  generating: "bg-purple-500/20 text-purple-300",
  editing: "bg-amber-500/20 text-amber-300",
  rendering: "bg-orange-500/20 text-orange-300",
  review: "bg-gold/20 text-gold",
  completed: "bg-green/20 text-green",
  pending: "bg-muted/20 text-muted",
  approved: "bg-green/20 text-green",
  rejected: "bg-red/20 text-red",
};

export function Badge({ value }: { value: ProjectStatus | ApprovalState | string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[value] ?? "bg-muted/20 text-muted"}`}>
      {value}
    </span>
  );
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}
