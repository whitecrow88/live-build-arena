/**
 * AI Builder Service
 *
 * For MVP: generates a structured scaffold from a prompt using
 * template files + placeholder content.
 *
 * Production path:
 * - Option A (recommended for cost): Spawn `codex` CLI as a child
 *   process (OpenAI Codex CLI subscription — no per-token cost).
 *   The Codex CLI reads a AGENTS.md spec and auto-implements tasks.
 * - Option B (fallback): OpenAI API with gpt-4o or o4-mini.
 *
 * The runner returns an array of { path, content } files to be
 * pushed to GitHub.
 */

import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { slugify } from "@/lib/utils";

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface BuildResult {
  files: GeneratedFile[];
  summary: string;
}

// ── Codex CLI runner ──────────────────────────────────────────────

/**
 * Run the Codex CLI (`codex` npm package) as a subprocess.
 *
 * Codex CLI: https://github.com/openai/codex
 * Install: npm install -g @openai/codex
 * Auth: set OPENAI_API_KEY in environment
 *
 * For stream use: the CLI reads an AGENTS.md file describing tasks
 * and auto-implements them. We write a temp AGENTS.md, run codex,
 * then read back the generated files.
 */
export async function runCodexCLI(
  prompt: string,
  timeLimitSeconds: number
): Promise<BuildResult> {
  const codexBin = process.env.CODEX_CLI_PATH ?? "codex";
  const workDir = path.join(os.tmpdir(), `lba-build-${Date.now()}`);
  await fs.mkdir(workDir, { recursive: true });

  // Write the task spec as AGENTS.md (Codex CLI convention)
  const agentsMd = `# Build Task

## Goal
${prompt}

## Requirements
- Build a working MVP prototype
- Use modern web technologies (Next.js / React / Vanilla JS as appropriate)
- Include a README.md
- Keep it minimal but functional
- Add comments explaining key decisions

## Constraints
- Time limit: ${Math.floor(timeLimitSeconds / 60)} minutes
- Deliverable: source files only (no deployment needed here)
`;

  await fs.writeFile(path.join(workDir, "AGENTS.md"), agentsMd);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("Codex CLI timed out"));
    }, timeLimitSeconds * 1000);

    const proc = spawn(codexBin, ["--approval-mode", "full-auto", "--quiet"], {
      cwd: workDir,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", async (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null) {
        reject(new Error(`Codex exited ${code}: ${stderr.slice(0, 500)}`));
        return;
      }

      // Read all generated files from workDir
      const files = await collectFiles(workDir);
      resolve({
        files,
        summary: `Generated ${files.length} files via Codex CLI`,
      });
    });
  });
}

async function collectFiles(dir: string): Promise<GeneratedFile[]> {
  const results: GeneratedFile[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true } as Parameters<typeof fs.readdir>[1]);

  for (const entry of entries as unknown as import("fs").Dirent[]) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(entry.path ?? dir, entry.name);
    const rel = path.relative(dir, fullPath).replace(/\\/g, "/");
    // Skip hidden files and AGENTS.md
    if (rel.startsWith(".") || rel === "AGENTS.md") continue;
    const content = await fs.readFile(fullPath, "utf-8").catch(() => "");
    results.push({ path: rel, content });
  }
  return results;
}

// ── Mock / Template scaffold (MVP fallback) ───────────────────────

/**
 * Returns a minimal Next.js scaffold based on the prompt.
 * Used when Codex CLI is unavailable or in dev/test mode.
 */
export async function mockAIBuild(prompt: string): Promise<BuildResult> {
  // Simulate build time
  await new Promise((r) => setTimeout(r, 3000));

  const projectTitle = prompt.slice(0, 60);

  const files: GeneratedFile[] = [
    {
      path: "README.md",
      content: `# ${projectTitle}

> Prototype built live on stream by Live Build Arena

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## What was built

${prompt}

---
*This is an MVP prototype delivered via Live Build Arena. One revision included.*
`,
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: slugify(projectTitle),
          version: "0.1.0",
          private: true,
          scripts: { dev: "next dev", build: "next build", start: "next start" },
          dependencies: { next: "15.1.0", react: "^19.0.0", "react-dom": "^19.0.0" },
          devDependencies: { typescript: "^5.7.2", "@types/react": "^19.0.1" },
        },
        null,
        2
      ),
    },
    {
      path: "src/app/page.tsx",
      content: `export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>${projectTitle}</h1>
      <p>Built live on stream — prototype delivered by Live Build Arena.</p>
      <p><em>Request: ${prompt.slice(0, 200)}</em></p>
      {/* TODO: implement the actual feature here */}
    </main>
  );
}
`,
    },
    {
      path: "src/app/layout.tsx",
      content: `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
    },
    {
      path: "next.config.ts",
      content: `import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
`,
    },
  ];

  return {
    files,
    summary: `Mock scaffold generated: ${files.length} files`,
  };
}

/** Pick the right builder based on environment */
export async function runBuilder(
  prompt: string,
  timeLimitSeconds: number,
  onLog: (step: string, message: string) => void
): Promise<BuildResult> {
  const useMock = process.env.USE_MOCK_BUILDER === "true" || !process.env.OPENAI_API_KEY;

  onLog("generating", useMock ? "Generating scaffold (mock mode)..." : "Running Codex CLI builder...");

  if (useMock) {
    const result = await mockAIBuild(prompt);
    return result;
  }

  return runCodexCLI(prompt, timeLimitSeconds);
}
