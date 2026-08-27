import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. Auth routes and clients can.
        }
      },
    },
  });
}

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireAdmin(request: Request) {
  const service = getServiceSupabase();
  if (!service) return { ok: false as const, status: 503, message: "Supabase admin credentials are not configured." };

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const importToken = request.headers.get("x-admin-import-token");
  if (importToken && importToken === process.env.ADMIN_IMPORT_TOKEN) {
    return { ok: true as const, service, userId: null };
  }
  if (!bearer) return { ok: false as const, status: 401, message: "Sign in as an admin." };

  const { data, error } = await service.auth.getUser(bearer);
  if (error || !data.user) return { ok: false as const, status: 401, message: "Invalid session." };
  const { data: admin } = await service.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) return { ok: false as const, status: 403, message: "Admin access required." };
  return { ok: true as const, service, userId: data.user.id };
}
