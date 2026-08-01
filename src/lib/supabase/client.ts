/**
 * Cliente de Supabase para el navegador.
 *
 * Usa la clave pública, así que todo lo que haga pasa por RLS. Pensado para
 * suscripciones en tiempo real (por ejemplo, refrescar los recordatorios sin
 * recargar) cuando haga falta.
 */

import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
  );
}
