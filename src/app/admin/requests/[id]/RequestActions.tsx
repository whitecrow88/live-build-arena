"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { RequestStatus } from "@/types";

const CANNED_REJECTION_REASONS = [
  "Out of scope for this stream",
  "Request contains policy violations",
  "Too large to complete in time limit",
  "Vague or unclear request",
  "Already delivered similar build",
  "Technical limitations prevent this build",
];

interface RequestActionsProps {
  requestId: string;
  currentStatus: RequestStatus;
  buildJobId?: string;
}

export function RequestActions({ requestId, currentStatus, buildJobId }: RequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function post(url: string, body?: object) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => r.json());
  }

  async function approve() {
    setLoading("approve");
    try {
      const data = await post(`/api/requests/${requestId}/approve`);
      if (data.success) { toast.success("Approved"); router.refresh(); }
      else toast.error(data.error);
    } finally { setLoading(null); }
  }

  async function reject() {
    const reason = window.prompt(
      "Rejection reason:\n\nSuggestions:\n" + CANNED_REJECTION_REASONS.map((r, i) => `${i + 1}. ${r}`).join("\n"),
      CANNED_REJECTION_REASONS[0]
    );
    if (!reason) return;
    setLoading("reject");
    try {
      const data = await post(`/api/requests/${requestId}/reject`, { reason });
      if (data.success) { toast.success("Rejected"); router.refresh(); }
      else toast.error(data.error);
    } finally { setLoading(null); }
  }

  async function startBuild() {
    setLoading("build");
    try {
      const data = await post(`/api/requests/${requestId}/start-build`);
      if (data.success) { toast.success("Build started!"); router.refresh(); }
      else toast.error(data.error);
    } finally { setLoading(null); }
  }

  async function deliver() {
    if (!buildJobId) return;
    const repoUrl = window.prompt("Repo URL:");
    if (!repoUrl) return;
    const previewUrl = window.prompt("Preview URL:");
    if (!previewUrl) return;
    setLoading("deliver");
    try {
      const data = await post(`/api/build-jobs/${buildJobId}/deliver`, { repo_url: repoUrl, preview_url: previewUrl });
      if (data.success) { toast.success("Marked as delivered!"); router.refresh(); }
      else toast.error(data.error);
    } finally { setLoading(null); }
  }

  async function markRefund() {
    const note = window.prompt("Refund note:");
    if (!note) return;
    setLoading("refund");
    try {
      const data = await post(`/api/requests/${requestId}/reject`, { reason: `Refund: ${note}` });
      toast.success("Refund note added");
      router.refresh();
    } finally { setLoading(null); }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(currentStatus === "queued" || currentStatus === "needs_clarification") && (
        <>
          <Button size="sm" variant="primary" loading={loading === "approve"} onClick={approve}>Approve</Button>
          <Button size="sm" variant="danger" loading={loading === "reject"} onClick={reject}>Reject</Button>
        </>
      )}
      {currentStatus === "approved" && (
        <Button size="sm" variant="amber" loading={loading === "build"} onClick={startBuild}>▶ Start Build</Button>
      )}
      {currentStatus === "building" && buildJobId && (
        <Button size="sm" variant="primary" loading={loading === "deliver"} onClick={deliver}>✓ Mark Delivered</Button>
      )}
      {["queued", "approved", "building", "failed"].includes(currentStatus) && (
        <Button size="sm" variant="ghost" loading={loading === "refund"} onClick={markRefund}>Issue Refund Note</Button>
      )}
    </div>
  );
}
