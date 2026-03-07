/**
 * GitHub service — creates repos and pushes generated files
 *
 * Uses GitHub REST API v3 via fetch (no SDK dependency).
 * Requires: GITHUB_TOKEN (fine-grained PAT with repo:write scope)
 *           GITHUB_ORG (org or username to create repos under)
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const GITHUB_ORG = process.env.GITHUB_ORG ?? "";
const API_BASE = "https://api.github.com";

interface GithubFile {
  path: string;
  content: string; // raw file content (not base64 — we encode it here)
}

interface CreateRepoResult {
  repo_url: string;
  clone_url: string;
  repo_name: string;
}

async function githubFetch(path: string, init?: RequestInit) {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN not configured");

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }

  return res.json();
}

/** Create a new repo under GITHUB_ORG */
export async function createRepo(repoName: string, description: string): Promise<CreateRepoResult> {
  // Try org first, fall back to user repos
  let endpoint = `/orgs/${GITHUB_ORG}/repos`;
  let data;
  try {
    data = await githubFetch(endpoint, {
      method: "POST",
      body: JSON.stringify({
        name: repoName,
        description,
        private: false,
        auto_init: true,
      }),
    });
  } catch {
    // fall back to user repo
    endpoint = `/user/repos`;
    data = await githubFetch(endpoint, {
      method: "POST",
      body: JSON.stringify({
        name: repoName,
        description,
        private: false,
        auto_init: true,
      }),
    });
  }

  return {
    repo_url: data.html_url,
    clone_url: data.clone_url,
    repo_name: data.name,
  };
}

/** Push a set of files to the repo via the Contents API */
export async function pushFiles(
  owner: string,
  repo: string,
  files: GithubFile[],
  commitMessage = "feat: initial generated scaffold"
) {
  // Get the latest commit SHA on main/master
  let branchName = "main";
  let latestSha: string | undefined;

  try {
    const ref = await githubFetch(`/repos/${owner}/${repo}/git/ref/heads/main`);
    latestSha = ref.object.sha;
  } catch {
    try {
      const ref = await githubFetch(`/repos/${owner}/${repo}/git/ref/heads/master`);
      branchName = "master";
      latestSha = ref.object.sha;
    } catch {
      // brand new empty repo — push each file without a parent
    }
  }

  // Push files one by one via Contents API (simpler than tree API for MVP)
  for (const file of files) {
    const b64 = Buffer.from(file.content).toString("base64");
    const body: Record<string, unknown> = {
      message: `${commitMessage}: ${file.path}`,
      content: b64,
      branch: branchName,
    };

    // Get existing file SHA if it exists (for updates)
    try {
      const existing = await githubFetch(
        `/repos/${owner}/${repo}/contents/${file.path}`
      );
      body.sha = existing.sha;
    } catch {
      // file doesn't exist yet — that's fine
    }

    await githubFetch(`/repos/${owner}/${repo}/contents/${file.path}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  return { repo_url: `https://github.com/${owner}/${repo}` };
}

// ── MOCK ─────────────────────────────────────────────────────────

export async function mockCreateRepo(repoName: string): Promise<CreateRepoResult> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 800));
  return {
    repo_url: `https://github.com/${GITHUB_ORG || "live-build-arena"}/${repoName}`,
    clone_url: `https://github.com/${GITHUB_ORG || "live-build-arena"}/${repoName}.git`,
    repo_name: repoName,
  };
}

export async function mockPushFiles(repoUrl: string, fileCount: number) {
  await new Promise((r) => setTimeout(r, 1200));
  return { repo_url: repoUrl, files_pushed: fileCount };
}
