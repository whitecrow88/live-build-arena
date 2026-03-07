"use client";

import { useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { formatAmount, truncate } from "@/lib/utils";
import type { Request } from "@/types";
import { useRouter } from "next/navigation";

interface RequestCardProps {
  request: Request;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onStartBuild?: (id: string) => void;
  compact?: boolean;
}

export function RequestCard({ request, onApprove, onReject, onStartBuild, compact }: RequestCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handle = async (action: string, fn: ((id: string) => void) | undefined) => {
    if (!fn) return;
    setLoading(action);
    try {
      await fn(request.id);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="rounded-xl border border-arena-border bg-arena-surface p-4 hover:border-arena-accent/40 transition-colors cursor-pointer"
      onClick={() => router.push(`/admin/requests/${request.id}`)}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">
            {request.pinned && <span className="text-arena-amber mr-1">📌</span>}
            {request.donor_name}
          </p>
          {!compact && (
            <p className="text-sm text-arena-muted mt-0.5">
              {truncate(request.requested_scope ?? request.donor_message, 100)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-arena-accent font-mono font-bold text-lg">
            {formatAmount(request.amount, request.currency)}
          </span>
          <StatusPill status={request.status} size="sm" />
        </div>
      </div>

      {request.moderation_flags && request.moderation_flags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {request.moderation_flags.map((f) => (
            <span key={f} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded px-1.5 py-0.5 font-mono">
              ⚠ {f.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons — stop propagation so card click doesn't fire */}
      <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
        {request.status === "queued" && (
          <>
            <Button
              size="sm"
              variant="primary"
              loading={loading === "approve"}
              onClick={() => handle("approve", onApprove)}
              title="Approve (A)"
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={loading === "reject"}
              onClick={() => handle("reject", onReject)}
              title="Reject (R)"
            >
              Reject
            </Button>
          </>
        )}
        {request.status === "approved" && (
          <Button
            size="sm"
            variant="amber"
            loading={loading === "build"}
            onClick={() => handle("build", onStartBuild)}
            title="Start Build (S)"
          >
            ▶ Start Build
          </Button>
        )}
      </div>
    </div>
  );
}
