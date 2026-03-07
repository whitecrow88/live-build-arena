/**
 * Vercel deployment service
 *
 * Triggers deployments via Vercel REST API v13.
 * Requires: VERCEL_TOKEN, VERCEL_TEAM_ID (optional)
 *
 * MVP: uses Git integration path — creates a project linked to
 * the GitHub repo, then triggers a deployment.
 */

const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? "";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID ?? "";
const VERCEL_API = "https://api.vercel.com";

async function vercelFetch(path: string, init?: RequestInit) {
  if (!VERCEL_TOKEN) throw new Error("VERCEL_TOKEN not configured");

  const url = new URL(`${VERCEL_API}${path}`);
  if (VERCEL_TEAM_ID) url.searchParams.set("teamId", VERCEL_TEAM_ID);

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vercel API ${res.status}: ${body}`);
  }

  return res.json();
}

interface DeployResult {
  deployment_url: string;
  deployment_id: string;
}

/** Create a Vercel project linked to a GitHub repo and trigger first deploy */
export async function deployFromGithub(
  projectName: string,
  githubOwner: string,
  githubRepo: string
): Promise<DeployResult> {
  // Create project
  const project = await vercelFetch("/v10/projects", {
    method: "POST",
    body: JSON.stringify({
      name: projectName,
      gitRepository: {
        type: "github",
        repo: `${githubOwner}/${githubRepo}`,
      },
      framework: "nextjs",
    }),
  });

  // Trigger deployment
  const deploy = await vercelFetch("/v13/deployments", {
    method: "POST",
    body: JSON.stringify({
      name: projectName,
      gitSource: {
        type: "github",
        org: githubOwner,
        repo: githubRepo,
        ref: "main",
      },
      projectId: project.id,
    }),
  });

  return {
    deployment_url: `https://${deploy.url}`,
    deployment_id: deploy.id,
  };
}

/** Poll deployment until ready or failed */
export async function waitForDeployment(
  deploymentId: string,
  timeoutMs = 600_000
): Promise<"ready" | "error"> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const deploy = await vercelFetch(`/v13/deployments/${deploymentId}`);
    if (deploy.readyState === "READY") return "ready";
    if (["ERROR", "CANCELED"].includes(deploy.readyState)) return "error";
    await new Promise((r) => setTimeout(r, 5000));
  }
  return "error";
}

// ── MOCK ─────────────────────────────────────────────────────────

export async function mockDeploy(projectName: string): Promise<DeployResult> {
  await new Promise((r) => setTimeout(r, 2000));
  const slug = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 30);
  return {
    deployment_url: `https://${slug}-${Math.random().toString(36).slice(2, 8)}.vercel.app`,
    deployment_id: `dpl_mock_${Date.now()}`,
  };
}
