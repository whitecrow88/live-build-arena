/**
 * Acceptance tests: utility functions
 */

import { formatAmount, formatTime, truncate, slugify, elapsedSeconds } from "@/lib/utils";

describe("formatAmount", () => {
  it("formats USD amounts", () => {
    expect(formatAmount(50, "USD")).toBe("$50");
    expect(formatAmount(1234.56, "USD")).toMatch(/\$1,234/);
  });
});

describe("formatTime", () => {
  it("formats seconds as MM:SS", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(900)).toBe("15:00");
    expect(formatTime(3661)).toBe("61:01");
  });
});

describe("truncate", () => {
  it("truncates long strings", () => {
    const long = "a".repeat(100);
    const result = truncate(long, 80);
    expect(result).toHaveLength(81); // 80 + "…"
    expect(result.endsWith("…")).toBe(true);
  });

  it("returns short strings unchanged", () => {
    expect(truncate("hello", 80)).toBe("hello");
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("React App! 2024")).toBe("react-app-2024");
  });

  it("truncates to 40 chars", () => {
    expect(slugify("a".repeat(100))).toHaveLength(40);
  });
});

describe("elapsedSeconds", () => {
  it("returns a number of seconds elapsed", () => {
    const start = new Date(Date.now() - 5000).toISOString();
    const elapsed = elapsedSeconds(start);
    expect(elapsed).toBeGreaterThanOrEqual(4);
    expect(elapsed).toBeLessThanOrEqual(6);
  });
});
