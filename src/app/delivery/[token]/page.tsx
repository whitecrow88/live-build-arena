import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import DeliveryClient from "./DeliveryClient";

export const dynamic = "force-dynamic";

async function getDelivery(token: string) {
  const db = createServiceClient();

  const { data: request } = await db
    .from("requests")
    .select(`
      id, donor_name, requested_scope, amount, currency, status, created_at,
      build_jobs (
        build_status, repo_url, preview_url, finished_at, logs
      )
    `)
    .eq("public_token", token)
    .eq("status", "delivered")
    .maybeSingle();

  return request;
}

async function getPolicy() {
  const db = createServiceClient();
  const { data } = await db.from("policies").select("refund_policy_text, one_revision_enabled").eq("id", 1).single();
  return data;
}

export default async function DeliveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [delivery, policy] = await Promise.all([
    getDelivery(token),
    getPolicy(),
  ]);

  if (!delivery) notFound();

  const buildJob = Array.isArray(delivery.build_jobs)
    ? delivery.build_jobs[0]
    : delivery.build_jobs;

  if (!buildJob) notFound();

  return (
    <DeliveryClient
      donorName={delivery.donor_name}
      requestedScope={delivery.requested_scope ?? ""}
      amount={delivery.amount}
      currency={delivery.currency}
      buildJob={buildJob}
      refundPolicyText={policy?.refund_policy_text ?? null}
    />
  );
}
