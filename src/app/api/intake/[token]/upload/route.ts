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

  // Validate token
  const { data: request } = await db
    .from("requests")
    .select("id")
    .eq("intake_token", token)
    .maybeSingle();

  if (!request) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "png";
  const filename = `${token}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await db.storage
    .from("intake-references")
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error("[intake-upload] Storage error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const url = `${supabaseUrl}/storage/v1/object/public/intake-references/${filename}`;

  return NextResponse.json({ url });
}
