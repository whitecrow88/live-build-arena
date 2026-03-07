/**
 * Acceptance tests: Kick webhook ingestion
 */

import { verifyKickSignature, normaliseKickEvent, mockKickDonationPayload } from "@/lib/services/kick";
import { autoModerate } from "@/lib/utils";
import crypto from "crypto";

describe("Kick webhook: signature verification", () => {
  const secret = "test_webhook_secret_abc123";
  const rawBody = JSON.stringify({ event_id: "evt_1", event_type: "donation", amount: 25 });

  it("accepts a valid HMAC-SHA256 signature", () => {
    const sig = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    process.env.KICK_WEBHOOK_SECRET = secret;
    expect(verifyKickSignature(rawBody, sig)).toBe(true);
  });

  it("accepts signature with sha256= prefix", () => {
    const sig = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    process.env.KICK_WEBHOOK_SECRET = secret;
    expect(verifyKickSignature(rawBody, sig)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    process.env.KICK_WEBHOOK_SECRET = secret;
    expect(verifyKickSignature(rawBody, "deadbeef")).toBe(false);
  });

  it("rejects when signature header is null", () => {
    process.env.KICK_WEBHOOK_SECRET = secret;
    expect(verifyKickSignature(rawBody, null)).toBe(false);
  });
});

describe("Kick webhook: event normalisation", () => {
  it("normalises a donation event", () => {
    const raw = {
      event_id: "evt_001",
      event_type: "donation",
      channel_id: "chan_123",
      sender: "TechWizard",
      message: "Build me a Pomodoro timer",
      amount: 50,
      currency: "USD",
      timestamp: "2024-01-01T12:00:00Z",
    };
    const event = normaliseKickEvent(raw);
    expect(event).not.toBeNull();
    expect(event!.event_id).toBe("evt_001");
    expect(event!.donor_name).toBe("TechWizard");
    expect(event!.amount).toBe(50);
    expect(event!.currency).toBe("USD");
  });

  it("returns null for non-donation events", () => {
    const raw = { event_type: "follow", event_id: "evt_002" };
    expect(normaliseKickEvent(raw)).toBeNull();
  });

  it("handles missing fields gracefully", () => {
    const raw = { event_type: "donation", amount: 10 };
    const event = normaliseKickEvent(raw);
    expect(event).not.toBeNull();
    expect(event!.donor_name).toBe("Anonymous");
    expect(event!.donor_message).toBe("");
  });

  it("generates event_id if missing", () => {
    const raw = { event_type: "donation", amount: 5 };
    const event = normaliseKickEvent(raw);
    expect(event!.event_id).toBeTruthy();
  });
});

describe("Mock Kick payload", () => {
  it("returns a valid KickDonationPayload", () => {
    const payload = mockKickDonationPayload({ amount: 100 });
    expect(payload.event_type).toBe("donation");
    expect(payload.amount).toBe(100);
    expect(payload.event_id).toMatch(/^kick_mock_/);
  });
});
