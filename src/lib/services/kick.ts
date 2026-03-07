/**
 * Kick webhook adapter
 *
 * In production, Kick sends HMAC-SHA256 signed webhooks.
 * This module verifies the signature and normalises the payload
 * into our internal KickDonationPayload shape.
 *
 * Docs: https://kick.com/developer (subject to change — Kick API is early-access)
 */

import crypto from "crypto";
import type { KickDonationPayload } from "@/types";

/** Verify Kick's HMAC-SHA256 signature on incoming webhook */
export function verifyKickSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.KICK_WEBHOOK_SECRET ?? "";
  if (!signatureHeader || !secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // Kick sends "sha256=<hex>" or just "<hex>" — normalise
  const incoming = signatureHeader.replace(/^sha256=/, "");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(incoming, "hex")
    );
  } catch {
    return false;
  }
}

/** Normalise a raw Kick donation/subscription webhook payload */
export function normaliseKickEvent(raw: Record<string, unknown>): KickDonationPayload | null {
  const eventType = raw.event_type as string | undefined;

  if (!["donation", "subscription", "gifted_subscription"].includes(eventType ?? "")) {
    return null;
  }

  // Kick payload shape (as of early-access API — may change)
  return {
    event_id: String(raw.event_id ?? raw.id ?? crypto.randomUUID()),
    event_type: eventType as KickDonationPayload["event_type"],
    channel_id: String(raw.channel_id ?? ""),
    donor_name: String(raw.sender ?? raw.donor_name ?? raw.username ?? "Anonymous"),
    donor_message: String(raw.message ?? raw.comment ?? ""),
    amount: Number(raw.amount ?? 0),
    currency: String(raw.currency ?? "USD").toUpperCase(),
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
  };
}

/** --- MOCK for dev/testing --- */
export function mockKickDonationPayload(overrides?: Partial<KickDonationPayload>): KickDonationPayload {
  return {
    event_id: `kick_mock_${Date.now()}`,
    event_type: "donation",
    channel_id: "mock_channel_123",
    donor_name: overrides?.donor_name ?? "TestDonor",
    donor_message: overrides?.donor_message ?? "Build me a to-do app with React and local storage",
    amount: overrides?.amount ?? 25,
    currency: overrides?.currency ?? "USD",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}
