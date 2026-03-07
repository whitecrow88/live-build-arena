/**
 * Build Runner — orchestrates the full build pipeline.
 * Imported by both the Next.js API route and the standalone build worker.
 */

import { createServiceClient } from "@/lib/supabase/admin";
import { runBuilder } from "@/lib/services/ai-builder";
import { createRepo, pushFiles, mockCreateRepo, mockPushFiles } from "@/lib/services/github";
import { deployFromGithub, mockDeploy } from "@/lib/services/vercel";
import { notifyDonorInChat } from "@/lib/services/chat";
import { buildSpecialistPrompt, buildFallbackPrompt, type IntakeData } from "@/lib/services/agent-prompts";
import { slugify } from "@/lib/utils";
import type { BuildLog, BuildStep } from "@/types";

const USE_MOCK = process.env.USE_MOCK_BUILDER !== "false";
const GITHUB_ORG = process.env.GITHUB_ORG ?? "";

export async function runBuildPipeline(buildJobId: string) {
  const db = createServiceClient();
  const logs: BuildLog[] = [];

  async function appendLog(step: BuildStep, message: string) {
    logs.push({ step, message, timestamp: new Date().toISOString() });
    await db
      .from("build_jobs")
      .update({ logs, updated_at: new Date().toISOString() })
      .eq("id", buildJobId);
    await db.from("audit_log").insert({
      entity_type: "build_job",
      entity_id: buildJobId,
      action: step,
      metadata: { message },
    });
  }

  try {
    const { data: job, error: jobErr } = await db
      .from("build_jobs")
      .select("*, requests(*)")
      .eq("id", buildJobId)
      .single();

    if (jobErr || !job) throw new Error("Build job not found");

    const request = job.requests as {
      id: string;
      donor_name: string;
      requested_scope: string;
      donor_message: string;
      source: string;
      intake_data: IntakeData | null;
    };
    const timeLimitSeconds = (job.time_cap_minutes ?? 15) * 60;

    // Mark running
    await db
      .from("build_jobs")
      .update({ build_status: "running", started_at: new Date().toISOString() })
      .eq("id", buildJobId);
    await db.from("requests").update({ status: "building" }).eq("id", request.id);

    // Step 1: Analyse
    await appendLog("analysing", "Analysing request and generating structured prompt...");
    const prompt = request.intake_data?.category
      ? buildSpecialistPrompt(request.donor_name, request.requested_scope ?? request.donor_message, request.intake_data)
      : buildFallbackPrompt(request.donor_name, request.requested_scope ?? request.donor_message);
    await db.from("build_jobs").update({ prompt_final: prompt }).eq("id", buildJobId);

    // Step 2: Generate
    const { files, summary } = await runBuilder(
      prompt,
      timeLimitSeconds,
      (step, msg) => appendLog(step as BuildStep, msg)
    );
    await appendLog("generating", `Code generation complete: ${summary}`);

    // Step 3: Create repo + push files
    await appendLog("creating_repo", "Creating GitHub repository...");
    const repoName = `lba-${slugify(request.requested_scope ?? request.donor_name)}-${Date.now().toString(36)}`;

    let repoUrl: string;
    let repoOwner: string;
    let repoRepoName: string;

    if (USE_MOCK) {
      const result = await mockCreateRepo(repoName);
      await mockPushFiles(result.repo_url, files.length);
      repoUrl = result.repo_url;
      repoOwner = GITHUB_ORG || "live-build-arena";
      repoRepoName = repoName;
    } else {
      const result = await createRepo(repoName, `Built live on stream for ${request.donor_name}`);
      await pushFiles(GITHUB_ORG, result.repo_name, files);
      repoUrl = result.repo_url;
      repoOwner = GITHUB_ORG;
      repoRepoName = result.repo_name;
    }

    await db.from("build_jobs").update({ repo_url: repoUrl }).eq("id", buildJobId);

    // Step 4: Deploy
    await appendLog("deploying", "Deploying preview to Vercel...");

    let previewUrl: string;
    if (USE_MOCK) {
      const result = await mockDeploy(repoName);
      previewUrl = result.deployment_url;
    } else {
      const result = await deployFromGithub(repoName, repoOwner, repoRepoName);
      previewUrl = result.deployment_url;
    }

    // Step 5: Deliver
    await appendLog("delivered", "Delivered successfully!");

    await db
      .from("build_jobs")
      .update({
        build_status: "success",
        finished_at: new Date().toISOString(),
        repo_url: repoUrl,
        preview_url: previewUrl,
        logs,
      })
      .eq("id", buildJobId);

    await db.from("requests").update({ status: "delivered" }).eq("id", request.id);

    await db.from("audit_log").insert({
      entity_type: "build_job",
      entity_id: buildJobId,
      action: "delivered",
      metadata: { repo_url: repoUrl, preview_url: previewUrl },
    });

    // Notify donor in chat with their delivery link
    const { data: deliveredRequest } = await db
      .from("requests")
      .select("public_token")
      .eq("id", request.id)
      .single();

    if (deliveredRequest?.public_token) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lsh-three.vercel.app";
      const deliveryUrl = `${appUrl}/delivery/${deliveredRequest.public_token}`;
      await notifyDonorInChat(request.source, request.donor_name, deliveryUrl);
    }

    return { success: true, repo_url: repoUrl, preview_url: previewUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await appendLog("error", `Build failed: ${message}`);

    await db
      .from("build_jobs")
      .update({
        build_status: "failed",
        finished_at: new Date().toISOString(),
        error_message: message,
        logs,
      })
      .eq("id", buildJobId);

    const { data: job } = await db
      .from("build_jobs")
      .select("request_id")
      .eq("id", buildJobId)
      .single();

    if (job) {
      await db.from("requests").update({ status: "failed" }).eq("id", job.request_id);
    }

    return { success: false, error: message };
  }
}

