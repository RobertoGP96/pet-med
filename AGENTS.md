<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pet Med — convenciones del proyecto

Historial médico de mascotas. Next.js 16 + React 19 + Tailwind 4 + Supabase.
Lee el `README.md` para la puesta en marcha y las decisiones de producto.

## Idioma

Todo en **español**: comentarios, textos de interfaz, mensajes de error,
nombres de tests. El código (variables, funciones, tipos) en inglés.

## Trampas de Next.js 16 en las que ya hemos caído

- `params` y `searchParams` son **promesas**. `const { petId } = await params`.
- Usa los tipos globales generados `PageProps<"/ruta">` y `LayoutProps<"/ruta">`
  en vez de escribir los props a mano. **No se importan.** Si TypeScript se
  queja de que `"/mi/ruta"` no satisface `"/"`, es que faltan por regenerar:
  `npx next typegen`.
- El middleware ahora es `proxy.ts` con `export function proxy`. No existe.
- `revalidateTag` pide **dos** argumentos en la 16.
- `cacheComponents` está **desactivado**: nada de `"use cache"` ni de
  `unstable_cache`. Para cachear, `fetch` con `next: { revalidate, tags }`.
- Turbopack es el compilador por defecto; no añadas `--turbopack` a los scripts.
- `next lint` no existe: `npm run lint` llama a `eslint` directamente.

## Arquitectura

```
src/domain/    Lógica pura. NO puede importar React, Next ni Supabase.
src/server/    queries.ts (lecturas) · actions.ts ("use server", escrituras) · mappers.ts
src/services/  APIs externas
src/lib/       env, clientes de supabase, storage, formato
src/components/ui/   VENDORIZADO (Aceternity). Se sobrescribe al actualizar.
src/components/…     Componentes propios, por dominio.
```

Reglas que no se saltan:

1. **`"use server"` sólo en `actions.ts`.** Ponerlo en las lecturas publicaría
   cada consulta como endpoint accesible desde el navegador.
2. **Toda entrada se valida con zod** (`src/domain/schemas.ts`) antes de tocar
   la base de datos. El `name` de cada campo del formulario coincide
   exactamente con la clave del esquema.
3. **Las funciones de dominio reciben `now: Date`** como parámetro; nunca leen
   el reloj por su cuenta. Es lo que las hace testeables.
4. **Nada de colores literales para estado de dominio.** Se usan los tokens
   (`text-health-alert`, `bg-brand`…) definidos en `src/app/globals.css`, vía
   `HEALTH_LEVEL_STYLES` cuando aplica.
5. **Las etiquetas en español de los enums salen de los `*_LABELS`** de
   `src/domain/enums.ts`, no se escriben a mano en los componentes.
6. Añadir un valor a un enum se hace en `src/domain/enums.ts` **y** en la
   migración SQL **y** en `src/lib/supabase/database.types.ts`.

## APIs externas

Perros: **dogapi.dog** (razas y curiosidades) y **dog.ceo** (fotos), sin clave.
Gatos: **The Cat API**, clave opcional en `CAT_API_KEY`.

No uses `api.thedogapi.com`: desde 2026 devuelve 403 sin clave. Fue la razón
del cambio de proveedor.

Regla: **nada en `src/services/` puede lanzar.** Son adornos del perfil; si la
API falla, la página se pinta igual sin ellos. Tiempo máximo con
`AbortSignal.timeout`, caché con `next: { revalidate, tags }` y `console.warn`
+ valor vacío al fallar.

## Base de datos

- El esquema vive en `supabase/migrations/`. Al cambiarlo hay que actualizar a
  mano `src/lib/supabase/database.types.ts` (o regenerarlo con
  `npx supabase gen types typescript --project-id <id>`).
- Columnas en `snake_case`; el dominio en `camelCase`. La traducción está
  aislada en `src/server/mappers.ts`.
- PostgREST devuelve las columnas `numeric` como **string**: por eso los
  mappers pasan las cantidades por `Number()`.

## Autenticación

No hay. Todo se atribuye a `APP_DEFAULT_OWNER_ID` y se accede con la clave
`service_role`. Los sitios que habrá que tocar están marcados con `TODO(auth)`.
El RLS del esquema ya tiene las políticas por `auth.uid()` escritas.

## Antes de dar algo por terminado

```bash
npm run verify   # typecheck + lint + test
npm run build
```
