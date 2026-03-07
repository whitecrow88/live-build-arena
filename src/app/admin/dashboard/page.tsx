import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatAmount, truncate } from "@/lib/utils";
import { BuildTimer } from "@/components/admin/BuildTimer";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getDashboardData() {
  const db = createServiceClient();

  const [queuedRes, buildingRes, deliveredTodayRes, activeBuildRes, recentRes] =
    await Promise.all([
      db.from("requests").select("id", { count: "exact" }).eq("status", "queued"),
      db.from("requests").select("id", { count: "exact" }).eq("status", "building"),
      db
        .from("requests")
        .select("id", { count: "exact" })
        .eq("status", "delivered")
        .gte("updated_at", new Date(Date.now() - 86400000).toISOString()),
      db
        .from("build_jobs")
        .select("*, requests(donor_name, requested_scope, amount, currency)")
        .eq("build_status", "running")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("requests")
        .select("id, donor_name, amount, currency, status, requested_scope, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  return {
    queuedCount: queuedRes.count ?? 0,
    buildingCount: buildingRes.count ?? 0,
    deliveredToday: deliveredTodayRes.count ?? 0,
    activeBuild: activeBuildRes.data,
    recent: recentRes.data ?? [],
  };
}

export default async function DashboardPage() {
  const { queuedCount, buildingCount, deliveredToday, activeBuild, recent } =
    await getDashboardData();

  const req = activeBuild
    ? (Array.isArray(activeBuild.requests) ? activeBuild.requests[0] : activeBuild.requests)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <Link
          href="/admin/requests"
          className="text-sm text-arena-accent hover:underline"
        >
          View all requests →
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Queued</CardTitle>
          </CardHeader>
          <p className="text-4xl font-bold font-mono text-white">{queuedCount}</p>
          <p className="text-xs text-arena-muted mt-1">awaiting approval</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Building</CardTitle>
          </CardHeader>
          <p className={`text-4xl font-bold font-mono ${buildingCount > 0 ? "text-arena-amber" : "text-white"}`}>
            {buildingCount}
          </p>
          <p className="text-xs text-arena-muted mt-1">in progress</p>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delivered Today</CardTitle>
          </CardHeader>
          <p className="text-4xl font-bold font-mono text-arena-accent">{deliveredToday}</p>
          <p className="text-xs text-arena-muted mt-1">shipped</p>
        </Card>
      </div>

      {/* Active build widget */}
      {activeBuild && req ? (
        <Card className="border-arena-amber/30 bg-amber-950/10">
          <CardHeader>
            <CardTitle className="text-arena-amber">Active Build</CardTitle>
            <Link href={`/admin/requests/${activeBuild.request_id}`} className="text-xs text-arena-accent hover:underline">
              View details →
            </Link>
          </CardHeader>
          <div className="flex items-center gap-6">
            <BuildTimer
              startedAt={activeBuild.started_at}
              timeCap={activeBuild.time_cap_minutes * 60}
            />
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{req.donor_name}</p>
              <p className="text-sm text-arena-muted mt-0.5 truncate">{truncate(req.requested_scope ?? "", 80)}</p>
              <p className="font-mono text-arena-accent mt-1">{formatAmount(req.amount, req.currency)}</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-dashed">
          <p className="text-arena-muted text-sm">No active build. Go to <Link href="/admin/requests" className="text-arena-accent hover:underline">Requests</Link> to start one.</p>
        </Card>
      )}

      {/* Recent requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {recent.map((r) => (
            <Link
              key={r.id}
              href={`/admin/requests/${r.id}`}
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-arena-border transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{r.donor_name}</p>
                <p className="text-xs text-arena-muted truncate">{truncate(r.requested_scope ?? "", 60)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-arena-accent text-sm">{formatAmount(r.amount, r.currency)}</span>
                <StatusPill status={r.status} size="sm" />
              </div>
            </Link>
          ))}
          {recent.length === 0 && (
            <p className="text-arena-muted text-sm py-2">No requests yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
