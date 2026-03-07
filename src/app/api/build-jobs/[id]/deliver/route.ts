/**
 * POST /api/build-jobs/:id/deliver
 *
 * Manually marks a build job as delivered.
 * Typically called after a successful build, but can also be used
 * to manually deliver if the build pipeline finished without auto-marking.
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

  const { data: job } = await db
    .from("build_jobs")
    .select("id, build_status, request_id, repo_url, preview_url")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Build job not found" }, { status: 404 });
  }

  const repoUrl: string = body.repo_url ?? job.repo_url;
  const previewUrl: string = body.preview_url ?? job.preview_url;

  if (!repoUrl || !previewUrl) {
    return NextResponse.json(
      { error: "repo_url and preview_url are required to deliver" },
      { status: 422 }
    );
  }

  await db
    .from("build_jobs")
    .update({
      build_status: "success",
      repo_url: repoUrl,
      preview_url: previewUrl,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id);

  await db
    .from("requests")
    .update({ status: "delivered", updated_at: new Date().toISOString() })
    .eq("id", job.request_id);

  await db.from("audit_log").insert({
    entity_type: "build_job",
    entity_id: id,
    action: "delivered",
    metadata: { repo_url: repoUrl, preview_url: previewUrl },
  });

  return NextResponse.json({ success: true, repo_url: repoUrl, preview_url: previewUrl });
}
