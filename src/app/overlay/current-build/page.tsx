/**
 * /overlay/current-build — OBS Browser Source
 *
 * Full-width build progress display. Shows:
 * - Donor name + request
 * - Countdown timer (large)
 * - Build step progress
 * - Logs tail
 *
 * Add to OBS as Browser Source:
 *   URL: http://localhost:3000/overlay/current-build
 *   Width: 800px, Height: 200px (bottom bar) or 400px (sidebar)
 */

import { formatAmount, truncate } from "@/lib/utils";
import type { CurrentBuildOverlay } from "@/types";
import { BuildOverlayClient } from "./BuildOverlayClient";

async function getCurrentBuild(): Promise<CurrentBuildOverlay> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/overlay/current-build`, { cache: "no-store" });
  if (!res.ok) return { build_job: null, request: null, elapsed_seconds: 0, time_cap_seconds: 0 };
  return res.json();
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STEP_LABELS: Record<string, string> = {
  analysing: "Analysing request",
  generating: "Generating code",
  creating_repo: "Creating GitHub repo",
  deploying: "Deploying to Vercel",
  delivered: "Delivered!",
  error: "Error",
};

const STEP_ORDER = ["analysing", "generating", "creating_repo", "deploying", "delivered"];

export default async function CurrentBuildOverlayPage() {
  const data = await getCurrentBuild();

  if (!data.build_job || !data.request) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6">
        <div className="bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 px-8 py-6">
          <p className="text-white/40 font-mono text-sm">No active build</p>
        </div>
      </div>
    );
  }

  const logs = data.build_job.logs ?? [];
  const currentStep = logs.length > 0 ? logs[logs.length - 1].step : "analysing";
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-transparent p-4 font-sans">
      <BuildOverlayClient
        buildJob={data.build_job}
        request={data.request}
        initialElapsed={data.elapsed_seconds}
        timeCap={data.time_cap_seconds}
      />
    </div>
  );
}
