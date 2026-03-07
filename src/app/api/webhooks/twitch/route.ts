/**
 * POST /api/webhooks/twitch
 *
 * Handles Twitch EventSub webhook events:
 * - channel.cheer (bits)
 * - channel.subscribe
 * - channel.subscription.gift
 *
 * Twitch requires a challenge handshake before events flow:
 * It sends a POST with message_type=webhook_callback_verification,
 * you must respond with the plain-text challenge value.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { autoModerate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TWITCH_SECRET = process.env.TWITCH_WEBHOOK_SECRET ?? "";
const TWITCH_MSG_ID = "twitch-eventsub-message-id";
const TWITCH_MSG_TIMESTAMP = "twitch-eventsub-message-timestamp";
const TWITCH_MSG_SIGNATURE = "twitch-eventsub-message-signature";
const TWITCH_MSG_TYPE = "twitch-eventsub-message-type";

function verifyTwitchSignature(
  messageId: string,
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  if (!TWITCH_SECRET) return false;
  const hmacMessage = messageId + timestamp + rawBody;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", TWITCH_SECRET).update(hmacMessage).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

function bitsToDollars(bits: number): number {
  // 1 USD = 100 bits (approximate)
  return Math.round((bits / 100) * 100) / 100;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const messageId = req.headers.get(TWITCH_MSG_ID) ?? "";
  const timestamp = req.headers.get(TWITCH_MSG_TIMESTAMP) ?? "";
  const signature = req.headers.get(TWITCH_MSG_SIGNATURE) ?? "";
  const messageType = req.headers.get(TWITCH_MSG_TYPE) ?? "";

  // Verify signature (skip in dev if secret not set)
  const valid = verifyTwitchSignature(messageId, timestamp, rawBody, signature);
  if (!valid && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Challenge handshake (MUST respond before events will flow) ──
  if (messageType === "webhook_callback_verification") {
    const challenge = payload.challenge as string;
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // ── Revocation notice ──
  if (messageType === "revocation") {
    console.warn("Twitch subscription revoked:", payload.subscription);
    return NextResponse.json({ received: true });
  }

  // ── Actual events ──
  if (messageType !== "notification") {
    return NextResponse.json({ received: true, skipped: true });
  }

  const db = createServiceClient();
  const subscriptionType = (payload.subscription as Record<string, unknown>)?.type as string;
  const event = payload.event as Record<string, unknown>;

  // Deduplicate by message ID
  const { data: existing } = await db
    .from("webhook_events")
    .select("id")
    .eq("provider", "twitch")
    .eq("event_id", messageId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Get active stream session
  const { data: session } = await db
    .from("stream_sessions")
    .select("id, intake_paused")
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Store raw event
  const { data: webhookEvent } = await db
    .from("webhook_events")
    .insert({
      provider: "twitch",
      event_id: messageId,
      event_type: subscriptionType,
      payload,
      processed: false,
    })
    .select("id")
    .single();

  if (session?.intake_paused) {
    return NextResponse.json({ received: true, queued: false, reason: "intake_paused" });
  }

  // ── Normalise per event type ──
  let donorName = "Anonymous";
  let donorMessage = "";
  let amount = 0;
  let currency = "USD";

  if (subscriptionType === "channel.cheer") {
    // Bits cheer
    donorName = (event.user_name as string) ?? (event.user_login as string) ?? "Anonymous";
    donorMessage = (event.message as string) ?? "";
    const bits = Number(event.bits ?? 0);
    amount = bitsToDollars(bits);
    currency = "USD";
  } else if (subscriptionType === "channel.subscribe") {
    donorName = (event.user_name as string) ?? (event.user_login as string) ?? "Anonymous";
    donorMessage = `Subscribed (Tier ${event.tier ?? "1000"})`;
    amount = event.tier === "3000" ? 25 : event.tier === "2000" ? 10 : 5;
    currency = "USD";
  } else if (subscriptionType === "channel.subscription.gift") {
    donorName = (event.user_name as string) ?? (event.user_login as string) ?? "Anonymous";
    const giftCount = Number(event.total ?? 1);
    donorMessage = `Gifted ${giftCount} sub(s)`;
    amount = giftCount * 5;
    currency = "USD";
  } else {
    // Unknown event type — store but don't create request
    return NextResponse.json({ received: true, skipped: true, type: subscriptionType });
  }

  // Skip tiny amounts (< $5) — not worth a build slot
  if (amount < 5) {
    return NextResponse.json({ received: true, skipped: true, reason: "amount_too_low" });
  }

  const flags = autoModerate(donorMessage);
  const autoReject =
    flags.includes("adult_content") ||
    flags.includes("illegal_activity") ||
    flags.includes("policy_violation");

  const { data: request, error } = await db
    .from("requests")
    .insert({
      source: "twitch",
      provider_event_id: messageId,
      donor_name: donorName,
      donor_message: donorMessage,
      amount,
      currency,
      status: autoReject ? "rejected" : "queued",
      stream_session_id: session?.id ?? null,
      requested_scope: donorMessage,
      moderation_flags: flags,
      rejection_reason: autoReject ? `Auto-rejected: ${flags.join(", ")}` : null,
      raw_payload: payload,
    })
    .select("id, status")
    .single();

  if (error) {
    console.error("Failed to create request from Twitch event:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  await db
    .from("webhook_events")
    .update({ processed: true, request_id: request.id })
    .eq("id", webhookEvent?.id);

  await db.from("audit_log").insert({
    entity_type: "request",
    entity_id: request.id,
    action: autoReject ? "auto_rejected" : "created",
    metadata: { source: "twitch", event_type: subscriptionType, flags },
  });

  return NextResponse.json({
    received: true,
    request_id: request.id,
    status: request.status,
  });
}
