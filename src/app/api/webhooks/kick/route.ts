/**
 * POST /api/webhooks/kick
 *
 * Receives Kick donation/subscription webhook events.
 * - Verifies HMAC-SHA256 signature
 * - Deduplicates by provider event_id
 * - Stores raw event in webhook_events
 * - Creates a request in 'queued' state
 * - Auto-moderates for obvious policy violations
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyKickSignature, normaliseKickEvent } from "@/lib/services/kick";
import { autoModerate } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-kick-signature") ?? req.headers.get("x-hub-signature-256");

  // Signature check (skip in dev if secret not set)
  const signatureValid = verifyKickSignature(rawBody, signature);
  if (!signatureValid && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = normaliseKickEvent(payload);
  if (!event) {
    // Not a donation event — acknowledge but ignore
    return NextResponse.json({ received: true, skipped: true });
  }

  const db = createServiceClient();

  // Deduplication — check if event_id already exists
  const { data: existing } = await db
    .from("webhook_events")
    .select("id")
    .eq("provider", "kick")
    .eq("event_id", event.event_id)
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

  // Store raw webhook event
  const { data: webhookEvent } = await db
    .from("webhook_events")
    .insert({
      provider: "kick",
      event_id: event.event_id,
      event_type: event.event_type,
      payload,
      processed: false,
    })
    .select("id")
    .single();

  // If intake is paused, store but don't create request
  if (session?.intake_paused) {
    return NextResponse.json({ received: true, queued: false, reason: "intake_paused" });
  }

  // Auto-moderate
  const flags = autoModerate(event.donor_message);

  // Determine initial status — auto-reject obvious violations
  const autoReject =
    flags.includes("adult_content") ||
    flags.includes("illegal_activity") ||
    flags.includes("policy_violation");

  const status = autoReject ? "rejected" : "approved";
  const rejectionReason = autoReject
    ? `Auto-rejected: ${flags.join(", ")}`
    : null;

  // Create request
  const { data: request, error } = await db
    .from("requests")
    .insert({
      source: "kick",
      provider_event_id: event.event_id,
      donor_name: event.donor_name,
      donor_message: event.donor_message,
      amount: event.amount,
      currency: event.currency,
      status,
      stream_session_id: session?.id ?? null,
      requested_scope: event.donor_message,
      moderation_flags: flags,
      rejection_reason: rejectionReason,
      raw_payload: payload,
    })
    .select("id, public_token, status")
    .single();

  if (error) {
    console.error("Failed to create request:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }

  // Mark webhook event as processed + link request
  await db
    .from("webhook_events")
    .update({ processed: true, request_id: request.id })
    .eq("id", webhookEvent?.id);

  // Audit log
  await db.from("audit_log").insert({
    entity_type: "request",
    entity_id: request.id,
    action: autoReject ? "auto_rejected" : "auto_approved",
    metadata: { source: "kick", event_id: event.event_id, flags },
  });

  // Auto-start build job — Railway worker picks it up within 5s
  if (!autoReject) {
    await db.from("build_jobs").insert({
      request_id: request.id,
      build_status: "pending",
      time_cap_minutes: 15,
    });
  }

  return NextResponse.json({
    received: true,
    request_id: request.id,
    status: request.status,
    flags,
  });
}
