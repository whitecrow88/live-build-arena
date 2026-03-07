"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RequestCard } from "@/components/admin/RequestCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { formatAmount } from "@/lib/utils";
import type { Request, RequestStatus } from "@/types";
import { toast } from "sonner";

const STATUS_FILTERS: { label: string; value: RequestStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Queued", value: "queued" },
  { label: "Approved", value: "approved" },
  { label: "Building", value: "building" },
  { label: "Delivered", value: "delivered" },
  { label: "Rejected", value: "rejected" },
];

export default function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState<RequestStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    const db = createClient();
    let query = db
      .from("requests")
      .select("*, build_jobs(id, build_status, started_at, repo_url, preview_url)")
      .order("pinned", { ascending: false })
      .order("amount", { ascending: false })
      .order("created_at", { ascending: true });

    if (filter !== "all") query = query.eq("status", filter);

    const { data } = await query;
    setRequests((data as Request[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchRequests();
    // Poll every 5s for live updates
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const focused = document.querySelector("[data-focused-request]");
      if (!focused) return;
      const id = (focused as HTMLElement).dataset.focusedRequest;
      if (e.key === "a") approveRequest(id!);
      if (e.key === "r") rejectRequest(id!);
      if (e.key === "s") startBuild(id!);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function approveRequest(id: string) {
    const res = await fetch(`/api/requests/${id}/approve`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      toast.success("Request approved");
      fetchRequests();
    } else {
      toast.error(data.error ?? "Failed to approve");
    }
  }

  async function rejectRequest(id: string, reason = "Rejected by streamer") {
    const reason_input = window.prompt("Rejection reason:", reason);
    if (reason_input === null) return;
    const res = await fetch(`/api/requests/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason_input }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Request rejected");
      fetchRequests();
    } else {
      toast.error(data.error ?? "Failed to reject");
    }
  }

  async function startBuild(id: string) {
    const res = await fetch(`/api/requests/${id}/start-build`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      toast.success("Build started!");
      fetchRequests();
    } else {
      toast.error(data.error ?? "Failed to start build");
    }
  }

  const exportCsv = () => {
    window.open(`/api/requests/export`, "_blank");
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Requests</h2>
        <Button size="sm" variant="ghost" onClick={exportCsv}>
          Export CSV ↓
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === value
                ? "bg-arena-accent text-arena-bg"
                : "text-arena-muted hover:text-white hover:bg-arena-border"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-arena-muted font-mono">
        Shortcuts: <kbd className="bg-arena-border px-1 rounded">A</kbd> approve ·{" "}
        <kbd className="bg-arena-border px-1 rounded">R</kbd> reject ·{" "}
        <kbd className="bg-arena-border px-1 rounded">S</kbd> start build
      </p>

      {loading ? (
        <div className="text-arena-muted py-12 text-center">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="text-arena-muted py-12 text-center">No requests found.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onApprove={approveRequest}
              onReject={rejectRequest}
              onStartBuild={startBuild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
