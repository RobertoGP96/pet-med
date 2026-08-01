/**
 * Cliente de Supabase para Server Components y Server Actions, con la clave
 * pública y las cookies de sesión.
 *
 * Hoy no se usa —la app va sin login y accede con la clave de servicio (ver
 * ./admin.ts)—, pero queda listo para el día que se active la autenticación:
 * respeta RLS y refresca la sesión a través de cookies.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getServerEnv } from "@/lib/env";
import type { Database } from "./database.types";

export async function createClient() {
  const cookieStore = await cookies();
  const env = getServerEnv();

  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` se llamó desde un Server Component, donde las cookies son
          // de sólo lectura. Es esperado y se puede ignorar siempre que haya
          // un proxy refrescando la sesión.
        }
      },
    },
  });
}
