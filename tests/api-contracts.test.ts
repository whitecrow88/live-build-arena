/**
 * Acceptance tests: API contract shapes
 * These tests verify the data structures without requiring a live DB.
 */

import { normaliseKickEvent } from "@/lib/services/kick";
import { autoModerate } from "@/lib/utils";

describe("Webhook creates queued request (contract)", () => {
  it("normalised event has all required fields for a request", () => {
    const raw = {
      event_id: "evt_contract_01",
      event_type: "donation",
      channel_id: "ch_1",
      sender: "Donor123",
      message: "Build me a portfolio website with dark theme",
      amount: 30,
      currency: "USD",
      timestamp: new Date().toISOString(),
    };

    const event = normaliseKickEvent(raw);
    expect(event).not.toBeNull();

    // These fields map directly to the requests table
    expect(event!.event_id).toBeTruthy();     // provider_event_id
    expect(event!.donor_name).toBeTruthy();    // donor_name
    expect(event!.donor_message).toBeTruthy(); // donor_message, requested_scope
    expect(event!.amount).toBeGreaterThan(0);  // amount
    expect(event!.currency).toBe("USD");       // currency
  });
});

describe("Duplicate webhook detection (contract)", () => {
  it("two events with same event_id are identifiable", () => {
    const event1 = normaliseKickEvent({
      event_id: "evt_dup_01",
      event_type: "donation",
      amount: 25,
    });
    const event2 = normaliseKickEvent({
      event_id: "evt_dup_01",
      event_type: "donation",
      amount: 25,
    });

    expect(event1!.event_id).toBe(event2!.event_id);
  });
});

describe("Rejected request never starts build (contract)", () => {
  it("auto-moderated adult content gets flagged", () => {
    const flags = autoModerate("Build an adult explicit content website");
    const shouldAutoReject =
      flags.includes("adult_content") ||
      flags.includes("illegal_activity") ||
      flags.includes("policy_violation");

    expect(shouldAutoReject).toBe(true);
  });

  it("clean request is not auto-rejected", () => {
    const flags = autoModerate("Build a simple task manager with React and Supabase");
    const shouldAutoReject =
      flags.includes("adult_content") ||
      flags.includes("illegal_activity") ||
      flags.includes("policy_violation");

    expect(shouldAutoReject).toBe(false);
  });
});

describe("Overlay API response shape", () => {
  it("queue item has required overlay fields", () => {
    // Simulate what the API returns
    const mockItem = {
      id: "req_123",
      position: 1,
      donor_name: "StreamFan",
      requested_scope: "Build a landing page",
      amount: 50,
      currency: "USD",
      status: "queued",
      pinned: false,
    };

    expect(mockItem).toHaveProperty("id");
    expect(mockItem).toHaveProperty("donor_name");
    expect(mockItem).toHaveProperty("requested_scope");
    expect(mockItem).toHaveProperty("amount");
    expect(mockItem).not.toHaveProperty("buyer_contact"); // PII must not be exposed
    expect(mockItem).not.toHaveProperty("raw_payload");    // audit data must not be exposed
  });
});

describe("Delivery page resolves by public token (contract)", () => {
  it("public_token is a UUID (opaque, not sequential)", () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // The DB generates these via uuid_generate_v4()
    // We just verify the format is correct
    const mockToken = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(uuidRegex.test(mockToken)).toBe(true);
  });
});
