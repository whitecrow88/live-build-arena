/**
 * POST /api/test/simulate
 *
 * Creates a fake donation/sub request and returns the intake URL.
 * ONLY works outside production — blocked in prod.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as {
    donor_name?: string;
    donor_message?: string;
    source?: string;
    amount?: number;
  };

  const db = createServiceClient();

  const { data: request, error } = await db
    .from("requests")
    .insert({
      source: body.source ?? "twitch",
      donor_name: body.donor_name ?? "TestViewer",
      donor_message: body.donor_message ?? "Build me a portfolio site",
      amount: body.amount ?? 10,
      currency: "USD",
      status: "approved",
      requested_scope: body.donor_message ?? "Build me a portfolio site",
      moderation_flags: [],
    })
    .select("id, intake_token")
    .single();

  if (error || !request) {
    return NextResponse.json({ error: "Failed to create test request", detail: error }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const intakeUrl = `${appUrl}/intake/${request.intake_token}`;

  return NextResponse.json({ request_id: request.id, intake_url: intakeUrl });
}
