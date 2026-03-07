import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ModerationFlag, RequestStatus, BuildStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAmount(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function elapsedSeconds(startedAt: string) {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
}

// ── Moderation ────────────────────────────────────────────────────

const BLOCKED_KEYWORDS = [
  "adult", "porn", "sex", "nude", "naked", "explicit",
  "hack", "malware", "phish", "crack", "exploit", "ransomware",
  "crack software", "keygen", "pirate", "torrent",
  "scam", "fraud", "fake", "spam",
];

const SCOPE_TOO_LARGE_KEYWORDS = [
  "full saas", "entire platform", "complete app with everything",
  "mobile app", "multi-tenant", "marketplace", "social network",
  "full stack with auth billing",
];

export function autoModerate(message: string): ModerationFlag[] {
  const lower = message.toLowerCase();
  const flags: ModerationFlag[] = [];

  if (BLOCKED_KEYWORDS.some((k) => lower.includes(k))) {
    flags.push("policy_violation");
  }
  if (lower.includes("adult") || lower.includes("porn") || lower.includes("explicit")) {
    flags.push("adult_content");
  }
  if (lower.includes("hack") || lower.includes("malware") || lower.includes("exploit")) {
    flags.push("illegal_activity");
  }
  if (SCOPE_TOO_LARGE_KEYWORDS.some((k) => lower.includes(k))) {
    flags.push("scope_too_large");
  }
  if (message.trim().length < 20) {
    flags.push("vague_request");
  }
  if (lower.includes("copyright") || lower.includes("clone of") || lower.includes("copy of")) {
    flags.push("copyright_infringement");
  }
  return [...new Set(flags)];
}

// ── Status helpers ────────────────────────────────────────────────

export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  queued: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  building: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  delivered: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-900/30 text-red-300 border-red-900/50",
  refunded: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  disputed: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  partial_refund: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  revised: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  dispute_open: "bg-orange-600/20 text-orange-300 border-orange-600/30",
  needs_clarification: "bg-sky-500/20 text-sky-400 border-sky-500/30",
};

export const BUILD_STATUS_COLORS: Record<BuildStatus, string> = {
  pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  running: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  success: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 40);
}

export function truncate(text: string, max = 80) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}
