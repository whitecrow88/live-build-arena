/**
 * Standalone Supabase service-role client.
 * Uses @supabase/supabase-js directly — NO next/headers dependency.
 * Safe to import from the build worker (Node.js process outside Next.js).
 */

import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
