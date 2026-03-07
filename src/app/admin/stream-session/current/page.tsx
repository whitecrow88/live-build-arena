import { createServiceClient } from "@/lib/supabase/server";
import { StreamSessionControls } from "./StreamSessionControls";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatAmount } from "@/lib/utils";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

async function getCurrentSession() {
  const db = createServiceClient();
  const { data: session } = await db
    .from("stream_sessions")
    .select("*")
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return { session: null, stats: null, pinned: null };

  const [statsRes, pinnedRes] = await Promise.all([
    db
      .from("requests")
      .select("status, amount")
      .eq("stream_session_id", session.id),
    db
      .from("requests")
      .select("id, donor_name, requested_scope, amount, currency, status")
      .eq("stream_session_id", session.id)
      .eq("pinned", true)
      .maybeSingle(),
  ]);

  const requests = statsRes.data ?? [];
  const stats = {
    total: requests.length,
    queued: requests.filter((r) => r.status === "queued").length,
    building: requests.filter((r) => r.status === "building").length,
    delivered: requests.filter((r) => r.status === "delivered").length,
    revenue: requests.filter((r) => ["delivered", "building", "approved"].includes(r.status)).reduce((s, r) => s + Number(r.amount), 0),
  };

  return { session, stats, pinned: pinnedRes.data };
}

export default async function StreamSessionPage() {
  const { session, stats, pinned } = await getCurrentSession();

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold text-white">Stream Session</h2>

      <StreamSessionControls session={session} />

      {session && stats && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Requests", value: stats.total, color: "text-white" },
              { label: "Queued", value: stats.queued, color: "text-blue-400" },
              { label: "Building", value: stats.building, color: "text-arena-amber" },
              { label: "Delivered", value: stats.delivered, color: "text-arena-accent" },
            ].map(({ label, value, color }) => (
              <Card key={label}>
                <p className="text-xs text-arena-muted">{label}</p>
                <p className={`text-3xl font-bold font-mono mt-1 ${color}`}>{value}</p>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Session Revenue</CardTitle>
            </CardHeader>
            <p className="text-3xl font-bold font-mono text-arena-accent">
              {formatAmount(stats.revenue)}
            </p>
            <p className="text-xs text-arena-muted mt-1">from approved + building + delivered requests</p>
          </Card>

          {pinned && (
            <Card className="border-arena-amber/30">
              <CardHeader>
                <CardTitle className="text-arena-amber">📌 Pinned Request</CardTitle>
                <StatusPill status={pinned.status} size="sm" />
              </CardHeader>
              <p className="font-semibold text-white">{pinned.donor_name}</p>
              <p className="text-sm text-arena-muted mt-1">{pinned.requested_scope}</p>
              <p className="font-mono text-arena-accent mt-2">{formatAmount(pinned.amount, pinned.currency)}</p>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Session Info</CardTitle>
            </CardHeader>
            <dl className="text-sm space-y-1">
              <div className="flex gap-2">
                <dt className="text-arena-muted w-24">Title:</dt>
                <dd className="text-white">{session.title}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-arena-muted w-24">Started:</dt>
                <dd className="text-white font-mono">{format(new Date(session.started_at), "MMM d, HH:mm")}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-arena-muted w-24">Status:</dt>
                <dd><StatusPill status={session.status === "live" ? "approved" : "delivered"} size="sm" /></dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-arena-muted w-24">Intake:</dt>
                <dd className={session.intake_paused ? "text-arena-red" : "text-arena-accent"}>
                  {session.intake_paused ? "⏸ Paused" : "● Live"}
                </dd>
              </div>
            </dl>
          </Card>
        </>
      )}
    </div>
  );
}
