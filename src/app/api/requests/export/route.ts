/**
 * GET /api/requests/export
 *
 * Exports all requests as CSV. Admin only (checked via ADMIN_SECRET header).
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const adminToken = req.cookies.get("admin_token")?.value;
  if (adminToken !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("requests")
    .select("id, source, donor_name, amount, currency, status, requested_scope, rejection_reason, moderation_flags, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = ["id", "source", "donor_name", "amount", "currency", "status", "requested_scope", "rejection_reason", "moderation_flags", "created_at", "updated_at"];
  const rows = (data ?? []).map((r) =>
    headers
      .map((h) => {
        const val = (r as Record<string, unknown>)[h];
        const str = Array.isArray(val) ? val.join("|") : String(val ?? "");
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="requests-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
