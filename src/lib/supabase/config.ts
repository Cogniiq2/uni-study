export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** When false the app runs in local mode: no login, progress lives in this browser only. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Server-side allow-list (comma separated). Empty = any authenticated user. */
export function isEmailAllowed(email: string | undefined | null): boolean {
  const list = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return true;
  return !!email && list.includes(email.toLowerCase());
}
