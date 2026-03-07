/**
 * Build Worker — persistent polling process.
 *
 * Runs on a VPS/Railway (NOT Vercel serverless).
 * Polls Supabase every 5s for pending build jobs and runs them one at a time.
 *
 * Start: npm run worker
 * Requires: all env vars from .env.local (loaded via dotenv)
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Now safe to import modules that read process.env
import { createServiceClient } from "../src/lib/supabase/admin";
import { runBuildPipeline } from "../src/lib/build-runner";

const POLL_INTERVAL_MS = 5_000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // every hour
const INTAKE_TIMEOUT_MS = 15 * 60 * 1000;   // 15 min intake window then auto-start
const PREVIEW_TTL_DAYS = 7;
let isProcessing = false;

async function pollForJobs() {
  if (isProcessing) return;

  const db = createServiceClient();

  const { data: job } = await db
    .from("build_jobs")
    .select("id")
    .eq("build_status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!job) return;

  isProcessing = true;
  console.log(`[worker] picked up job ${job.id}`);

  try {
    const result = await runBuildPipeline(job.id);
    if (result.success) {
      console.log(`[worker] job ${job.id} delivered — ${result.repo_url}`);
    } else {
      console.error(`[worker] job ${job.id} failed — ${result.error}`);
    }
  } catch (err) {
    console.error(`[worker] uncaught error for job ${job.id}:`, err);
  } finally {
    isProcessing = false;
  }
}

async function cleanupExpiredPreviews() {
  const db = createServiceClient();
  const cutoff = new Date(Date.now() - PREVIEW_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: expired } = await db
    .from("build_jobs")
    .select("id, preview_url")
    .eq("build_status", "success")
    .eq("preview_deleted", false)
    .lt("finished_at", cutoff)
    .limit(10);

  if (!expired || expired.length === 0) return;

  for (const job of expired) {
    if (job.preview_url) {
      try {
        // Extract deployment URL slug and delete via Vercel API
        const urlSlug = new URL(job.preview_url).hostname.split(".")[0];
        const vercelToken = process.env.VERCEL_TOKEN;
        const teamId = process.env.VERCEL_TEAM_ID;
        if (vercelToken) {
          const teamParam = teamId ? `?teamId=${teamId}` : "";
          // Find deployment by URL
          const listRes = await fetch(
            `https://api.vercel.com/v6/deployments${teamParam}&url=${job.preview_url}`,
            { headers: { Authorization: `Bearer ${vercelToken}` } }
          );
          if (listRes.ok) {
            const { deployments } = await listRes.json() as { deployments: { uid: string }[] };
            if (deployments?.[0]?.uid) {
              await fetch(
                `https://api.vercel.com/v13/deployments/${deployments[0].uid}${teamParam}`,
                { method: "DELETE", headers: { Authorization: `Bearer ${vercelToken}` } }
              );
              console.log(`[worker] deleted expired preview: ${job.preview_url}`);
            }
          }
        }
      } catch (err) {
        console.error(`[worker] failed to delete preview for job ${job.id}:`, err);
      }
    }

    await db
      .from("build_jobs")
      .update({ preview_deleted: true })
      .eq("id", job.id);
  }

  if (expired.length > 0) {
    console.log(`[worker] cleaned up ${expired.length} expired preview(s)`);
  }
}

/**
 * Auto-start fallback: if a donor never filled in their intake form within
 * INTAKE_TIMEOUT_MS, create a build job using their original donation message.
 */
async function autoStartTimedOutIntakes() {
  const db = createServiceClient();
  const cutoff = new Date(Date.now() - INTAKE_TIMEOUT_MS).toISOString();

  // Find approved requests with no build_job and intake not submitted, older than cutoff
  const { data: timedOut } = await db
    .from("requests")
    .select("id, donor_name")
    .eq("status", "approved")
    .is("intake_submitted_at", null)
    .lt("created_at", cutoff)
    .limit(5);

  if (!timedOut || timedOut.length === 0) return;

  for (const req of timedOut) {
    // Check no build_job exists
    const { data: existing } = await db
      .from("build_jobs")
      .select("id")
      .eq("request_id", req.id)
      .maybeSingle();

    if (existing) continue;

    console.log(`[worker] intake timeout — auto-starting build for request ${req.id} (${req.donor_name})`);
    await db.from("build_jobs").insert({
      request_id: req.id,
      build_status: "pending",
      time_cap_minutes: 15,
    });
    await db.from("audit_log").insert({
      entity_type: "request",
      entity_id: req.id,
      action: "intake_timeout_auto_start",
      metadata: { reason: "Donor did not fill intake within 15 minutes" },
    });
  }
}

async function main() {
  console.log(`[worker] starting — polling every ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`[worker] USE_MOCK_BUILDER=${process.env.USE_MOCK_BUILDER ?? "not set (defaults to mock)"}`);
  console.log(`[worker] Supabase URL=${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  // Initial poll immediately, then on interval
  await pollForJobs();
  setInterval(pollForJobs, POLL_INTERVAL_MS);

  // Cleanup expired previews hourly
  await cleanupExpiredPreviews();
  setInterval(cleanupExpiredPreviews, CLEANUP_INTERVAL_MS);

  // Auto-start builds where intake timed out — check every minute
  await autoStartTimedOutIntakes();
  setInterval(autoStartTimedOutIntakes, 60_000);
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[worker] shutting down gracefully...");
  process.exit(0);
});
