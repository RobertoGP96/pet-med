/**
 * Cliente de Supabase con la clave secreta (service_role).
 *
 * SÓLO puede importarse desde código de servidor: la clave salta las
 * políticas RLS. Mientras la app no tenga autenticación de usuarios, esta es
 * la vía por la que la capa de datos lee y escribe, y la seguridad se apoya en
 * que ninguna de estas funciones se expone directamente al cliente.
 *
 * Cuando se añada login, las consultas deben migrar a `createServerClient()`
 * de ./server.ts para que RLS haga su trabajo por usuario.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";
import type { Database } from "./database.types";

export type Db = SupabaseClient<Database>;

let cached: Db | null = null;

export function getDb(): Db {
  if (cached) return cached;

  const env = getServerEnv();

  cached = createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      // No hay sesión de usuario que mantener: es una conexión de servidor.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}
