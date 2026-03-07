/**
 * POST /api/requests/:id/reject
 * Body: { reason: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = createServiceClient();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason: string = body.reason ?? "Rejected by streamer";

  const { data: request } = await db
    .from("requests")
    .select("id, status, build_jobs(id, build_status)")
    .eq("id", id)
    .single();

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // Cannot reject if building or already delivered
  if (["building", "delivered"].includes(request.status)) {
    return NextResponse.json(
      { error: `Cannot reject request in status: ${request.status}` },
      { status: 422 }
    );
  }

  const { error } = await db
    .from("requests")
    .update({
      status: "rejected",
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await db.from("audit_log").insert({
    entity_type: "request",
    entity_id: id,
    action: "rejected",
    metadata: { reason },
  });

  return NextResponse.json({ success: true, status: "rejected", reason });
}
