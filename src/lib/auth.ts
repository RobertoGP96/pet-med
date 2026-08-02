/**
 * Sesión de la persona usuaria.
 *
 * Este archivo sustituye al antiguo `getCurrentOwnerId()` de `lib/env.ts`, que
 * devolvía siempre el mismo UUID de relleno. Ahora la identidad sale de la
 * cookie de sesión de Supabase, y con ella la RLS del esquema —que llevaba
 * escrita desde la migración inicial— por fin hace su trabajo.
 *
 * SÓLO SERVIDOR. Depende de `next/headers`, así que importarlo desde un
 * componente de cliente falla en tiempo de compilación, que es lo que se busca.
 *
 * Las tres funciones se diferencian en qué hacen cuando no hay sesión:
 *
 *   getSessionUser()  → devuelve null. Para lo que se pinta distinto según haya
 *                       o no sesión, como el mural o la barra de navegación.
 *   requireUser()     → redirige a /acceso. Para las páginas y acciones
 *                       privadas.
 *   requireAdmin()    → 404 si no es administrador. Un 403 confirmaría que
 *                       /admin existe; el 404 no cuenta nada.
 */

import { cache } from "react";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type UserRole = Enums<"user_role">;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

/**
 * Quién hace la petición, o null si nadie ha iniciado sesión.
 *
 * Va envuelta en `cache()` de React: una misma petición puede preguntarlo
 * media docena de veces —el layout, la página, cada acción— y sólo se resuelve
 * una vez.
 *
 * Usa `getUser()` y no `getSession()`: el segundo se cree la cookie tal cual
 * viene, mientras que el primero la verifica contra el servidor de Supabase.
 * Para decidir permisos hace falta el segundo comportamiento.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // El perfil es la única fuente del rol: `user_metadata` lo escribe el propio
  // cliente y por tanto no se puede usar para autorizar nada.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    // Si el disparador de alta de perfil no llegó a correr, el rol más
    // restrictivo es el correcto.
    role: profile?.role ?? "user",
  };
});

/** La sesión, o un desvío a /acceso si no la hay. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/acceso");
  return user;
}

/** La sesión de un administrador, o un 404. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/acceso");
  if (user.role !== "admin") notFound();
  return user;
}

/** Nombre con el que dirigirse a alguien sin que quede un hueco vacío. */
export function displayNameOf(user: SessionUser): string {
  return user.displayName?.trim() || user.email.split("@")[0] || "Tu cuenta";
}
