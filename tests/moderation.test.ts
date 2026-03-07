/**
 * Acceptance tests: Moderation + auto-flagging
 */

import { autoModerate } from "@/lib/utils";

describe("autoModerate", () => {
  it("flags adult content", () => {
    const flags = autoModerate("Build me an adult content website with explicit images");
    expect(flags).toContain("adult_content");
    expect(flags).toContain("policy_violation");
  });

  it("flags illegal activity", () => {
    const flags = autoModerate("Create a malware tool that hacks into servers");
    expect(flags).toContain("illegal_activity");
  });

  it("flags scope too large", () => {
    const flags = autoModerate("Build a full SaaS with multi-tenant support and mobile app");
    expect(flags).toContain("scope_too_large");
  });

  it("flags vague requests", () => {
    const flags = autoModerate("make app");
    expect(flags).toContain("vague_request");
  });

  it("flags copyright infringement", () => {
    const flags = autoModerate("Build a clone of Netflix for streaming");
    expect(flags).toContain("copyright_infringement");
  });

  it("does not flag clean requests", () => {
    const flags = autoModerate("Build a simple to-do app with React and local storage, dark theme");
    expect(flags).toHaveLength(0);
  });

  it("does not flag Pomodoro timer", () => {
    const flags = autoModerate("Build me a Pomodoro timer app with sound alerts and session history");
    expect(flags).toHaveLength(0);
  });

  it("deduplicates flags", () => {
    const flags = autoModerate("adult porn explicit hack malware");
    const unique = new Set(flags);
    expect(unique.size).toBe(flags.length);
  });
});
