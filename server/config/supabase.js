import { createClient } from "@supabase/supabase-js";
import env from "./env.js";

const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Boot-time diagnostic so we can verify production points at the right database.
try {
  const url = String(env.supabaseUrl || "");
  const host = url.replace(/^https?:\/\//, "").split("/")[0];
  // eslint-disable-next-line no-console
  console.log("[supabase] connected:", { host, hasServiceRoleKey: Boolean(env.supabaseServiceRoleKey) });
} catch {
  // ignore
}

export default supabase;
