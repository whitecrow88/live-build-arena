import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

async function getDelivery(token: string) {
  const db = createServiceClient();

  const { data: request } = await db
    .from("requests")
    .select(`
      id, donor_name, requested_scope, amount, currency, status, created_at,
      build_jobs (
        build_status, repo_url, preview_url, finished_at, logs
      )
    `)
    .eq("public_token", token)
    .eq("status", "delivered")
    .maybeSingle();

  return request;
}

async function getPolicy() {
  const db = createServiceClient();
  const { data } = await db.from("policies").select("refund_policy_text, one_revision_enabled").eq("id", 1).single();
  return data;
}

export default async function DeliveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [delivery, policy] = await Promise.all([
    getDelivery(token),
    getPolicy(),
  ]);

  if (!delivery) notFound();

  const buildJob = Array.isArray(delivery.build_jobs)
    ? delivery.build_jobs[0]
    : delivery.build_jobs;

  const deliveredAt = buildJob?.finished_at ?? delivery.created_at;

  return (
    <div className="min-h-screen bg-arena-bg flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-arena-accent/10 border-2 border-arena-accent flex items-center justify-center text-3xl mx-auto mb-4">
            🚀
          </div>
          <h1 className="text-3xl font-bold text-white">Your Build is Ready!</h1>
          <p className="text-arena-muted text-sm mt-2">
            Delivered {format(new Date(deliveredAt), "MMM d, yyyy 'at' HH:mm")}
          </p>
        </div>

        {/* Donor info */}
        <div className="rounded-xl border border-arena-border bg-arena-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-arena-muted font-mono uppercase tracking-wider">Requested by</p>
              <p className="text-xl font-bold text-white mt-1">{delivery.donor_name}</p>
              <p className="text-sm text-arena-muted mt-2 leading-relaxed">{delivery.requested_scope}</p>
            </div>
            <span className="text-arena-accent font-mono font-bold text-2xl shrink-0">
              {formatAmount(delivery.amount, delivery.currency)}
            </span>
          </div>
        </div>

        {/* Links */}
        {buildJob && (
          <div className="rounded-xl border border-arena-accent/30 bg-emerald-950/10 p-5 space-y-3">
            <h2 className="font-semibold text-arena-accent text-sm uppercase tracking-wider font-mono">
              Deliverables
            </h2>

            {buildJob.repo_url && (
              <a
                href={buildJob.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-arena-border hover:border-arena-accent bg-arena-bg transition-colors group"
              >
                <span className="text-2xl">📦</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white text-sm">GitHub Repository</p>
                  <p className="text-arena-muted text-xs font-mono truncate">{buildJob.repo_url}</p>
                </div>
                <span className="text-arena-accent group-hover:translate-x-0.5 transition-transform">→</span>
              </a>
            )}

            {buildJob.preview_url && (
              <a
                href={buildJob.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-arena-border hover:border-arena-accent bg-arena-bg transition-colors group"
              >
                <span className="text-2xl">🌐</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white text-sm">Live Preview</p>
                  <p className="text-arena-muted text-xs font-mono truncate">{buildJob.preview_url}</p>
                </div>
                <span className="text-arena-accent group-hover:translate-x-0.5 transition-transform">→</span>
              </a>
            )}
          </div>
        )}

        {/* Revision info */}
        {policy?.one_revision_enabled && (
          <div className="rounded-xl border border-arena-border p-4 flex items-start gap-3">
            <span className="text-xl">✏️</span>
            <div>
              <p className="font-semibold text-white text-sm">1 Revision Included</p>
              <p className="text-arena-muted text-xs mt-0.5">
                Contact the streamer on stream to request your one included revision.
              </p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-xl border border-arena-border p-4 bg-arena-surface/50">
          <p className="text-xs font-mono text-arena-muted uppercase tracking-wider mb-2">Disclaimer</p>
          <p className="text-xs text-arena-muted leading-relaxed">
            This is an MVP prototype built live on stream under a {Math.round((buildJob?.logs?.length ?? 1) > 3 ? 15 : 15)}-minute time cap.
            It is delivered as-is and is not guaranteed to be production-ready.
            {policy?.refund_policy_text && " " + policy.refund_policy_text}
          </p>
        </div>

        <p className="text-center text-xs text-arena-muted">
          Built live on stream by{" "}
          <span className="text-arena-accent font-mono">Live Build Arena</span>
        </p>
      </div>
    </div>
  );
}
