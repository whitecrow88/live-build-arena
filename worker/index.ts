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

async function main() {
  console.log(`[worker] starting — polling every ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`[worker] USE_MOCK_BUILDER=${process.env.USE_MOCK_BUILDER ?? "not set (defaults to mock)"}`);
  console.log(`[worker] Supabase URL=${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  // Initial poll immediately, then on interval
  await pollForJobs();
  setInterval(pollForJobs, POLL_INTERVAL_MS);
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
