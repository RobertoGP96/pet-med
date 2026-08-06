/**
 * Proxy (lo que hasta Next.js 15 se llamaba middleware).
 *
 * Hace dos cosas, y ninguna es autorizar:
 *
 *   1. Refresca la cookie de sesión de Supabase. Los Server Components no
 *      pueden escribir cookies, así que sin este paso el token caducaría y la
 *      sesión se caería sola a media navegación.
 *   2. Desvía lo evidente: a /acceso si se pide una ruta privada sin sesión, y
 *      al panel si se pide /acceso teniéndola.
 *
 * La comprobación de verdad vive en las páginas y las acciones, con
 * `requireUser()` / `requireAdmin()` de `lib/auth.ts` y con la RLS del esquema.
 * La documentación de Next lo dice explícitamente: el proxy sirve para
 * comprobaciones optimistas, no como sistema de permisos. Alguien que llame a
 * una Server Action directamente no pasa por aquí.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv, isSupabaseConfigured } from "@/lib/env";

/** Prefijos que exigen sesión. El resto es público. */
const PRIVATE_PREFIXES = ["/mascotas", "/recordatorios", "/vacunas", "/peso", "/fotos", "/cuenta", "/admin"];

/** Rutas que no tienen sentido con la sesión ya iniciada. */
const GUEST_ONLY = ["/acceso", "/registro"];

export async function proxy(request: NextRequest) {
  // Sin credenciales la app arranca igual y enseña la pantalla de configuración
  // (ver components/setup-notice.tsx). Aquí simplemente no hay nada que hacer.
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  // Este objeto se reasigna dentro de `setAll`. Es el patrón que exige
  // @supabase/ssr: la respuesta tiene que llevar las cookies nuevas, y para eso
  // hay que reconstruirla después de que el cliente las haya fijado.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANTE: esta llamada es la que refresca el token. No se puede quitar
  // ni mover después de los desvíos, o la sesión dejaría de renovarse.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = request.nextUrl.clone();
    url.pathname = "/acceso";
    // Para volver a donde se quería ir después de entrar.
    url.search = `?siguiente=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (user && GUEST_ONLY.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/mascotas";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Todo menos los archivos que no llevan sesión: estáticos de Next, imágenes
     * optimizadas, el favicon, las fotos subidas con el driver local y
     * cualquier imagen suelta. Que el proxy corra sobre ellos sería una llamada
     * de red a Supabase por cada archivo.
     *
     * `manifest.webmanifest` y `opengraph-image` van en la lista por lo mismo,
     * aunque no acaben en una extensión de imagen: el navegador pide el
     * manifest en cada carga de página y ninguno de los dos depende de quién
     * seas. Sin excluirlos, cada uno costaba un `auth.getUser()` —ida y vuelta
     * de red al servidor de Supabase— para no usar el resultado.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|opengraph-image|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
