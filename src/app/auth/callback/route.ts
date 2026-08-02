/**
 * Vuelta del enlace de confirmación del correo.
 *
 * Supabase manda a esta ruta después de que alguien pulse el enlace del correo
 * de alta. Llega de una de dos formas según cómo esté redactada la plantilla
 * del proyecto, y aquí se aceptan las dos para no depender de ese detalle:
 *
 *   · `?code=…`                  flujo PKCE, el que usa @supabase/ssr por
 *                                defecto. Se canjea por una sesión.
 *   · `?token_hash=…&type=…`     plantilla clásica con `{{ .TokenHash }}`.
 *
 * Es un route handler y no una página porque lo único que hace es fijar la
 * cookie de sesión y redirigir: no pinta nada.
 */

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Mismo filtro que en el formulario de acceso: el destino viene de la URL, y
  // sin comprobar que es una ruta interna esto sería un redirector abierto.
  const requested = searchParams.get("siguiente") ?? "/mascotas";
  const next = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/mascotas";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // Enlace caducado, ya usado o manipulado. Se vuelve al acceso con un aviso en
  // vez de dejar una pantalla en blanco.
  return NextResponse.redirect(new URL("/acceso?error=enlace", origin));
}
