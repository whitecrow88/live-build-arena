import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { BuildTimer } from "@/components/admin/BuildTimer";
import { BuildLogViewer } from "@/components/admin/BuildLogViewer";
import { formatAmount } from "@/lib/utils";
import { format } from "date-fns";
import { RequestActions } from "./RequestActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getRequest(id: string) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("requests")
    .select(`
      *,
      build_jobs (
        id, build_status, prompt_final, started_at, finished_at,
        time_cap_minutes, repo_url, preview_url, logs, error_message, created_at
      ),
      revisions (id, revision_count, notes, requested_at, completed_at)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

async function getAuditLog(id: string) {
  const db = createServiceClient();
  const { data } = await db
    .from("audit_log")
    .select("*")
    .eq("entity_type", "request")
    .eq("entity_id", id)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getRequest(id);
  if (!request) notFound();

  const auditLog = await getAuditLog(id);
  const buildJob = Array.isArray(request.build_jobs)
    ? request.build_jobs[0]
    : request.build_jobs;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-white">{request.donor_name}</h2>
            <StatusPill status={request.status} />
          </div>
          <p className="text-arena-muted text-sm font-mono">
            {format(new Date(request.created_at), "MMM d, yyyy HH:mm:ss")} ·{" "}
            via {request.source} · {formatAmount(request.amount, request.currency)}
          </p>
        </div>
        <RequestActions requestId={id} currentStatus={request.status} buildJobId={buildJob?.id} />
      </div>

      {/* Request detail */}
      <Card>
        <CardHeader>
          <CardTitle>Request Scope</CardTitle>
        </CardHeader>
        <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
          {request.requested_scope ?? request.donor_message}
        </p>
        {request.donor_message !== request.requested_scope && (
          <>
            <CardTitle className="mt-4 mb-2">Original Message</CardTitle>
            <p className="text-arena-muted text-sm">{request.donor_message}</p>
          </>
        )}
        {request.rejection_reason && (
          <div className="mt-3 p-3 bg-red-950/20 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">
              <span className="font-semibold">Rejection reason:</span> {request.rejection_reason}
            </p>
          </div>
        )}
        {request.moderation_flags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {request.moderation_flags.map((f: string) => (
              <span key={f} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded px-2 py-0.5 font-mono">
                ⚠ {f.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Active build */}
      {buildJob && (
        <Card className={buildJob.build_status === "running" ? "border-arena-amber/30" : ""}>
          <CardHeader>
            <CardTitle>Build Job</CardTitle>
            <StatusPill status={buildJob.build_status} type="build" size="sm" />
          </CardHeader>

          {buildJob.build_status === "running" && buildJob.started_at && (
            <BuildTimer
              startedAt={buildJob.started_at}
              timeCap={buildJob.time_cap_minutes * 60}
              className="mb-4"
            />
          )}

          {buildJob.repo_url && (
            <div className="flex gap-3 mb-4">
              <a href={buildJob.repo_url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-arena-accent hover:underline font-mono">
                📦 GitHub Repo →
              </a>
              {buildJob.preview_url && (
                <a href={buildJob.preview_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-arena-accent hover:underline font-mono">
                  🚀 Live Preview →
                </a>
              )}
            </div>
          )}

          <details className="group">
            <summary className="text-sm font-medium text-arena-muted cursor-pointer hover:text-white select-none">
              Build Logs ({buildJob.logs?.length ?? 0} entries)
            </summary>
            <div className="mt-3">
              <BuildLogViewer logs={buildJob.logs ?? []} />
            </div>
          </details>
        </Card>
      )}

      {/* Delivery info */}
      {request.status === "delivered" && buildJob?.repo_url && (
        <Card className="border-arena-accent/30 bg-emerald-950/10">
          <CardHeader>
            <CardTitle className="text-arena-accent">Delivered</CardTitle>
          </CardHeader>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-arena-muted">Repo: </span>
              <a href={buildJob.repo_url} target="_blank" rel="noopener noreferrer"
                className="text-arena-accent hover:underline font-mono break-all">
                {buildJob.repo_url}
              </a>
            </p>
            <p>
              <span className="text-arena-muted">Preview: </span>
              <a href={buildJob.preview_url} target="_blank" rel="noopener noreferrer"
                className="text-arena-accent hover:underline font-mono break-all">
                {buildJob.preview_url}
              </a>
            </p>
            <p className="text-arena-muted text-xs font-mono">
              Delivery page: /delivery/{request.public_token}
            </p>
          </div>
        </Card>
      )}

      {/* Audit log */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <div className="space-y-2 font-mono text-xs">
          {auditLog.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 py-1.5 border-b border-arena-border/30 last:border-0">
              <time className="text-arena-muted shrink-0 tabular-nums">
                {format(new Date(entry.created_at), "HH:mm:ss")}
              </time>
              <span className="text-arena-accent font-medium">{entry.action}</span>
              {Object.keys(entry.metadata).length > 0 && (
                <span className="text-arena-muted truncate">{JSON.stringify(entry.metadata)}</span>
              )}
            </div>
          ))}
          {auditLog.length === 0 && <p className="text-arena-muted">No audit entries yet.</p>}
        </div>
      </Card>
    </div>
  );
}
