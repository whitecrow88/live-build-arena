/**
 * Acceptance tests: Build pipeline mock services
 */

import { mockAIBuild } from "@/lib/services/ai-builder";
import { mockCreateRepo, mockPushFiles } from "@/lib/services/github";
import { mockDeploy } from "@/lib/services/vercel";

describe("mockAIBuild", () => {
  it("returns files array with at least 3 files", async () => {
    const result = await mockAIBuild("Build a to-do app with React and local storage");
    expect(result.files.length).toBeGreaterThanOrEqual(3);
  }, 10000);

  it("includes README.md", async () => {
    const result = await mockAIBuild("Build a landing page");
    const readme = result.files.find((f) => f.path === "README.md");
    expect(readme).toBeDefined();
    expect(readme!.content.length).toBeGreaterThan(0);
  }, 10000);

  it("includes package.json", async () => {
    const result = await mockAIBuild("Build a simple app");
    const pkg = result.files.find((f) => f.path === "package.json");
    expect(pkg).toBeDefined();
    const parsed = JSON.parse(pkg!.content);
    expect(parsed.name).toBeTruthy();
  }, 10000);

  it("returns a summary string", async () => {
    const result = await mockAIBuild("Build something");
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  }, 10000);
});

describe("mockCreateRepo", () => {
  it("returns a repo URL containing the repo name", async () => {
    const result = await mockCreateRepo("test-repo-123");
    expect(result.repo_url).toContain("test-repo-123");
    expect(result.repo_url).toMatch(/^https:\/\/github\.com\//);
  }, 5000);
});

describe("mockDeploy", () => {
  it("returns a deployment URL ending in .vercel.app", async () => {
    const result = await mockDeploy("my-test-project");
    expect(result.deployment_url).toMatch(/\.vercel\.app$/);
    expect(result.deployment_url).toMatch(/^https:\/\//);
  }, 5000);

  it("returns a deployment_id", async () => {
    const result = await mockDeploy("another-project");
    expect(result.deployment_id).toMatch(/^dpl_mock_/);
  }, 5000);
});

describe("Successful build stores repo and preview URLs", () => {
  it("full pipeline mock returns both URLs", async () => {
    const aiResult = await mockAIBuild("Build a URL shortener");
    expect(aiResult.files.length).toBeGreaterThan(0);

    const repoResult = await mockCreateRepo("url-shortener-test");
    expect(repoResult.repo_url).toContain("url-shortener-test");

    const deployResult = await mockDeploy("url-shortener-test");
    expect(deployResult.deployment_url).toContain(".vercel.app");

    // Both URLs present
    expect(repoResult.repo_url).toBeTruthy();
    expect(deployResult.deployment_url).toBeTruthy();
  }, 30000);
});
