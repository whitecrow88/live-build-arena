/**
 * GET /api/overlay/current-build
 *
 * Returns the currently running build job and its parent request.
 * Used by the OBS overlay to show build progress + timer.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const db = createServiceClient();

  // Find the running build job
  const { data: job } = await db
    .from("build_jobs")
    .select(`
      id, build_status, started_at, finished_at, time_cap_minutes,
      repo_url, preview_url, logs, error_message,
      requests (
        id, donor_name, requested_scope, amount, currency
      )
    `)
    .eq("build_status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ build_job: null, request: null, elapsed_seconds: 0, time_cap_seconds: 0 });
  }

  const elapsed = job.started_at
    ? Math.floor((Date.now() - new Date(job.started_at).getTime()) / 1000)
    : 0;

  const req = Array.isArray(job.requests) ? job.requests[0] : job.requests;

  return NextResponse.json({
    build_job: {
      id: job.id,
      build_status: job.build_status,
      started_at: job.started_at,
      finished_at: job.finished_at,
      time_cap_minutes: job.time_cap_minutes,
      repo_url: job.repo_url,
      preview_url: job.preview_url,
      logs: job.logs,
      error_message: job.error_message,
    },
    request: req
      ? {
          id: req.id,
          donor_name: req.donor_name,
          requested_scope: req.requested_scope,
          amount: req.amount,
          currency: req.currency,
        }
      : null,
    elapsed_seconds: elapsed,
    time_cap_seconds: job.time_cap_minutes * 60,
  });
}
