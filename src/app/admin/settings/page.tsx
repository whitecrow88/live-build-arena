import { createServiceClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

async function getPolicy() {
  const db = createServiceClient();
  const { data } = await db.from("policies").select("*").eq("id", 1).single();
  return data;
}

export default async function SettingsPage() {
  const policy = await getPolicy();

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-white">Settings</h2>
      <SettingsForm policy={policy} />
    </div>
  );
}
