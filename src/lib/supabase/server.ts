import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL, isEmailAllowed, isSupabaseConfigured } from "./config";

export async function getServerSupabase() {
  if (!isSupabaseConfigured) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // called from a Server Component — cookies are refreshed by proxy.ts instead
        }
      },
    },
  });
}

/** Defense in depth for route handlers: true if local mode or an allowed user is signed in. */
export async function isAuthorized(): Promise<boolean> {
  const sb = await getServerSupabase();
  if (!sb) return true;
  const { data } = await sb.auth.getUser();
  return !!data.user && isEmailAllowed(data.user.email);
}
