import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const db = createServiceClient();

  const { data: request } = await db
    .from("requests")
    .select("id, status, intake_submitted_at")
    .eq("intake_token", token)
    .maybeSingle();

  if (!request) {
    return NextResponse.json({ error: "Invalid intake token" }, { status: 404 });
  }

  if (request.intake_submitted_at) {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  if (request.status === "rejected" || request.status === "failed") {
    return NextResponse.json({ error: "Request is no longer active" }, { status: 410 });
  }

  const body = await req.json() as {
    category?: string;
    answers?: Record<string, string | string[]>;
    additional_notes?: string;
    reference_images?: string[];
  };

  const intakeData = {
    category: body.category ?? "other",
    answers: body.answers ?? {},
    additional_notes: body.additional_notes ?? "",
    reference_images: body.reference_images ?? [],
  };

  // Save intake data on request
  await db
    .from("requests")
    .update({
      project_category: intakeData.category,
      intake_data: intakeData,
      reference_images: intakeData.reference_images,
      intake_submitted_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  // Create build job — worker picks up within 5s
  await db.from("build_jobs").insert({
    request_id: request.id,
    build_status: "pending",
    time_cap_minutes: 15,
  });

  await db.from("audit_log").insert({
    entity_type: "request",
    entity_id: request.id,
    action: "intake_submitted",
    metadata: { category: intakeData.category },
  });

  return NextResponse.json({ success: true });
}
