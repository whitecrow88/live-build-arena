import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import IntakeForm from "./IntakeForm";

export const dynamic = "force-dynamic";

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = createServiceClient();

  const { data: request } = await db
    .from("requests")
    .select("id, donor_name, donor_message, intake_submitted_at, status")
    .eq("intake_token", token)
    .maybeSingle();

  if (!request) notFound();

  // Already submitted
  if (request.intake_submitted_at) {
    return (
      <div className="min-h-screen bg-arena-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-bold text-white">Already submitted!</h1>
          <p className="text-arena-muted">Your build details have been received. We&apos;re working on it now.</p>
        </div>
      </div>
    );
  }

  // Rejected or invalid status
  if (request.status === "rejected" || request.status === "failed") {
    return (
      <div className="min-h-screen bg-arena-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-5xl">❌</div>
          <h1 className="text-2xl font-bold text-white">This request is no longer active.</h1>
          <p className="text-arena-muted">Contact us on Discord if you think this is a mistake.</p>
        </div>
      </div>
    );
  }

  return (
    <IntakeForm
      intakeToken={token}
      donorName={request.donor_name}
      donorMessage={request.donor_message}
    />
  );
}
