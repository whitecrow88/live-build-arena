/**
 * POST /api/requests/:id/start-build
 *
 * Creates a build_job and triggers the build pipeline.
 * Request must be in 'approved' status.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { runBuildPipeline } from "@/lib/build-runner";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = createServiceClient();
  const { id } = await params;

  const { data: request } = await db
    .from("requests")
    .select("id, status, requested_scope, donor_message, donor_name")
    .eq("id", id)
    .single();

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (request.status !== "approved") {
    return NextResponse.json(
      { error: `Request must be approved before starting build. Current status: ${request.status}` },
      { status: 422 }
    );
  }

  // Check for existing active build job
  const { data: existingJob } = await db
    .from("build_jobs")
    .select("id, build_status")
    .eq("request_id", id)
    .in("build_status", ["pending", "running"])
    .maybeSingle();

  if (existingJob) {
    return NextResponse.json(
      { error: "A build is already running for this request", build_job_id: existingJob.id },
      { status: 409 }
    );
  }

  const { data: policy } = await db
    .from("policies")
    .select("max_build_minutes")
    .eq("id", 1)
    .single();

  const { data: job, error: jobErr } = await db
    .from("build_jobs")
    .insert({
      request_id: id,
      build_status: "pending",
      time_cap_minutes: policy?.max_build_minutes ?? 15,
    })
    .select("id")
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ error: "Failed to create build job" }, { status: 500 });
  }

  await db.from("audit_log").insert({
    entity_type: "build_job",
    entity_id: job.id,
    action: "build_started",
    metadata: { request_id: id },
  });

  // Run the build pipeline in the background (non-blocking response)
  // In production: use a proper job queue (Inngest, BullMQ, Trigger.dev)
  // For MVP: fire-and-forget async
  setImmediate(() => {
    runBuildPipeline(job.id).catch((err) => {
      console.error("Build pipeline error:", err);
    });
  });

  return NextResponse.json({
    success: true,
    build_job_id: job.id,
    message: "Build started",
  });
}
