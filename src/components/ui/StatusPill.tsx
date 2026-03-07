import { cn, REQUEST_STATUS_COLORS, BUILD_STATUS_COLORS } from "@/lib/utils";
import type { RequestStatus, BuildStatus } from "@/types";

interface StatusPillProps {
  status: RequestStatus | BuildStatus;
  type?: "request" | "build";
  size?: "sm" | "md";
}

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  approved: "Approved",
  rejected: "Rejected",
  building: "Building...",
  delivered: "Delivered",
  failed: "Failed",
  refunded: "Refunded",
  disputed: "Disputed",
  partial_refund: "Partial Refund",
  revised: "Revised",
  dispute_open: "Dispute Open",
  needs_clarification: "Needs Clarification",
  pending: "Pending",
  running: "Running",
  success: "Success",
};

export function StatusPill({ status, type = "request", size = "md" }: StatusPillProps) {
  const colorMap = type === "build" ? BUILD_STATUS_COLORS : REQUEST_STATUS_COLORS;
  const color = (colorMap as Record<string, string>)[status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";

  return (
    <span
      className={cn(
        "inline-flex items-center border rounded-full font-mono font-medium tracking-tight",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        color
      )}
    >
      {status === "building" || status === "running" ? (
        <span className="mr-1.5 w-1.5 h-1.5 rounded-full bg-current animate-pulse inline-block" />
      ) : null}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
