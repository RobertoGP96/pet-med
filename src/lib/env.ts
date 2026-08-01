/**
 * Acceso a variables de entorno.
 *
 * Dos reglas:
 * 1. Las `NEXT_PUBLIC_*` se leen de forma literal (`process.env.NEXT_PUBLIC_X`)
 *    porque Next las sustituye en tiempo de compilación; un acceso dinámico
 *    devolvería `undefined` en el navegador.
 * 2. La validación es *perezosa*. Si se validara al importar, un `.env.local`
 *    incompleto reventaría el build entero en vez de mostrar una pantalla de
 *    configuración. Ver `isSupabaseConfigured()`.
 */

import { z } from "zod";

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const publicEnv = {
  supabaseUrl: NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;

/** ¿Hay credenciales suficientes para hablar con Supabase? */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    publicEnv.supabaseUrl &&
      publicEnv.supabasePublishableKey &&
      process.env.SUPABASE_SECRET_KEY,
  );
}

const serverEnvSchema = z.object({
  supabaseUrl: z.url("NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida"),
  supabasePublishableKey: z.string().min(1, "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseSecretKey: z.string().min(1, "Falta SUPABASE_SECRET_KEY"),
  defaultOwnerId: z.uuid("APP_DEFAULT_OWNER_ID debe ser un UUID"),
  storageDriver: z.enum(["local", "supabase"]).default("local"),
  storageBucket: z.string().min(1).default("pet-photos"),
  catApiKey: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Devuelve la configuración de servidor ya validada.
 * Lanza un error legible —no un stack de zod— si falta algo.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse({
    supabaseUrl: publicEnv.supabaseUrl,
    supabasePublishableKey: publicEnv.supabasePublishableKey,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    defaultOwnerId: process.env.APP_DEFAULT_OWNER_ID,
    storageDriver: process.env.STORAGE_DRIVER || undefined,
    storageBucket: process.env.STORAGE_BUCKET || undefined,
    catApiKey: process.env.CAT_API_KEY || undefined,
  });

  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  · ${issue.message}`).join("\n");
    throw new Error(
      `Configuración de entorno incompleta:\n${problems}\n\n` +
        `Copia .env.example a .env.local y rellena los valores.`,
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Identidad del dueño mientras no exista autenticación.
 * Cuando se añada login, esta función pasa a leer la sesión de Supabase y
 * es el único punto que hay que tocar.
 */
export function getCurrentOwnerId(): string {
  return getServerEnv().defaultOwnerId;
}
