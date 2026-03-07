/**
 * POST /api/requests/:id/approve
 *
 * Approves a queued request. If policy.auto_start_on_approve is true,
 * also triggers the build immediately.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = createServiceClient();
  const { id } = await params;

  // Verify request exists and is queued
  const { data: request, error: fetchErr } = await db
    .from("requests")
    .select("id, status, donor_name")
    .eq("id", id)
    .single();

  if (fetchErr || !request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (!["queued", "needs_clarification"].includes(request.status)) {
    return NextResponse.json(
      { error: `Cannot approve request in status: ${request.status}` },
      { status: 422 }
    );
  }

  const { error } = await db
    .from("requests")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit
  await db.from("audit_log").insert({
    entity_type: "request",
    entity_id: id,
    action: "approved",
    metadata: { donor_name: request.donor_name },
  });

  // Check auto_start policy
  const { data: policy } = await db
    .from("policies")
    .select("auto_start_on_approve, max_build_minutes")
    .eq("id", 1)
    .single();

  if (policy?.auto_start_on_approve) {
    // Create build job and kick off build in background
    const { data: job } = await db
      .from("build_jobs")
      .insert({
        request_id: id,
        build_status: "pending",
        time_cap_minutes: policy.max_build_minutes,
      })
      .select("id")
      .single();

    if (job) {
      // Fire and forget — build runner runs async
      // In production, this should be a job queue (BullMQ, Inngest, etc.)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/build-jobs/${job.id}/run`, {
        method: "POST",
        headers: { "x-internal-secret": process.env.ADMIN_SECRET ?? "" },
      }).catch(console.error);

      return NextResponse.json({ success: true, status: "building", build_job_id: job.id });
    }
  }

  return NextResponse.json({ success: true, status: "approved" });
}
