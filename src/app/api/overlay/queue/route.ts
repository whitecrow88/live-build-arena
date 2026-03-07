/**
 * GET /api/overlay/queue
 *
 * Returns top 5 queued requests sorted by amount desc, timestamp asc.
 * Pinned request always appears first.
 * Safe — no PII exposed (no buyer_contact, raw_payload etc.)
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const db = createServiceClient();

  const { data, error } = await db
    .from("requests")
    .select("id, public_token, donor_name, requested_scope, amount, currency, status, pinned, created_at")
    .in("status", ["queued", "approved"])
    .order("pinned", { ascending: false })
    .order("amount", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((r, i) => ({
    id: r.id,
    position: i + 1,
    donor_name: r.donor_name,
    requested_scope: r.requested_scope ?? r.donor_name,
    amount: r.amount,
    currency: r.currency,
    status: r.status,
    pinned: r.pinned,
  }));

  return NextResponse.json({ items });
}
