# Pet Med

Historial médico de mascotas: cumpleaños, padecimientos, control de medicación,
peso, historia clínica y fotos. Incluye un **mural** público con las fotos y
descripciones de las mascotas, **recordatorios** de medicación y vacunas, e
**indicadores de salud** calculados a partir de lo que se registra.

## Stack

| Pieza | Elección | Por qué |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | Server Components y Server Actions: los formularios funcionan sin API intermedia |
| UI | React 19 + Tailwind CSS 4 | |
| Componentes | [Aceternity UI](https://ui.aceternity.com) sobre shadcn CLI + Motion | Copy-paste, no dependencia: el código vive en `src/components/ui/` y se edita libremente |
| Iconos | lucide-react | |
| Transiciones | View Transitions de React (`experimental.viewTransition`) | La foto del mural se transforma en la foto de la ficha |
| Base de datos | Supabase (Postgres) | |
| Validación | zod 4 | Un único esquema por entidad para formulario y base de datos |
| Datos de raza | dogapi.dog / The Cat API / dog.ceo | Peso, esperanza de vida, rasgos, curiosidades y fotos — todo gratis y sin clave |
| Tests | Vitest | Sobre la lógica pura de dominio |

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y rellenar (ver abajo)
npm run dev
```

Sin configurar Supabase la app arranca igual y muestra una pantalla con los
pasos pendientes, en vez de reventar.

### 1. Crear el proyecto de Supabase

En [supabase.com](https://supabase.com), crear un proyecto y esperar a que
termine de aprovisionarse.

### 2. Aplicar el esquema

En el **SQL Editor** del panel, ejecutar en este orden:

1. `supabase/migrations/20260801120000_init.sql` — tablas, tipos, índices,
   triggers y políticas RLS.
2. `supabase/seed.sql` — *opcional*, tres mascotas de ejemplo con historial
   completo para ver la app con datos.

Con la CLI de Supabase, alternativamente:

```bash
supabase link --project-ref <id-del-proyecto>
supabase db push
```

### 3. Rellenar `.env.local`

De **Project Settings → API**:

| Variable | Qué es |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon) |
| `SUPABASE_SECRET_KEY` | Clave secreta (service_role). **Nunca** se expone al cliente |
| `APP_DEFAULT_OWNER_ID` | UUID del dueño mientras no haya login |
| `STORAGE_DRIVER` | `local` (por defecto) o `supabase` |
| `CAT_API_KEY` | Opcional; sin ella The Cat API responde con menos cuota. Las APIs de perro no usan clave |

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run test       # vitest
npm run verify     # typecheck + lint + test
npm run format     # prettier
```

## Estructura

```
src/
├─ app/                    Rutas (App Router)
│  ├─ page.tsx             Mural público
│  ├─ mascotas/            Listado, alta y ficha con pestañas
│  └─ recordatorios/
├─ domain/                 Lógica pura, sin React ni base de datos
│  ├─ enums.ts             Enumeraciones + etiquetas en español
│  ├─ types.ts             Entidades
│  ├─ schemas.ts           Validación con zod
│  ├─ breed.ts
│  └─ health/              Motor de indicadores (con tests)
├─ server/                 Acceso a datos
│  ├─ queries.ts           Lecturas (Server Components)
│  ├─ actions.ts           Escrituras ("use server")
│  └─ mappers.ts           snake_case ⇄ camelCase
├─ services/breeds/        APIs de raza, curiosidades y fotos
├─ lib/                    env, supabase, storage, formato
└─ components/
   ├─ ui/                  VENDORIZADO (Aceternity) — se sobrescribe al actualizar
   └─ …                    Componentes propios por dominio
```

### Reglas de la arquitectura

- **`src/domain/` no importa nada de React, Next ni Supabase.** Es lógica pura
  y por eso se puede testear con Vitest sin montar nada.
- **Las lecturas van en `queries.ts`, las escrituras en `actions.ts`.** Sólo el
  segundo lleva `"use server"`: poner esa directiva en las lecturas publicaría
  cada consulta como endpoint accesible desde el navegador.
- **`src/components/ui/` es código de terceros.** Se regenera con
  `npx shadcn@latest add @aceternity/<nombre>`. El `eslint.config.mjs` le
  relaja las reglas por eso; el código propio no las relaja.
- **Toda entrada se valida con zod antes de tocar la base de datos.**

## Indicadores de salud

Se calculan en `src/domain/health/` y no se guardan en base de datos. Cuando
falta información, el indicador lo dice en vez de inventar un valor.

| Indicador | Cómo sale |
| --- | --- |
| Edad y etapa vital | Umbrales WSAVA/AAHA por especie y tamaño: un gran danés es senior a los 7 años y un chihuahua a los 11 |
| Edad humana equivalente | Perros: fórmula epigenética de Wang et al. (2020), `16·ln(edad)+31`. Gatos: escala clínica 15 / 24 / +4 |
| Tendencia de peso | Variación frente al peso de hace ≥90 días. >5 % vigilar, >10 % alerta |
| Condición corporal | Escala BCS de 9 puntos; peso ideal ≈ `actual / (1 + 0,1·(BCS−5))` |
| Peso para su raza | Contra el rango de la raza con 15 % de margen; en perros usa el rango del sexo de la mascota |
| Adherencia al tratamiento | Tomas administradas ÷ tomas ya vencidas |
| Vacunación y desparasitación | Según el `next_due_at` de la historia clínica |
| Proporción de vida | Edad ÷ esperanza de vida media de la raza |

> No sustituyen a un diagnóstico veterinario, y la interfaz lo dice.

## APIs externas

Todas gratuitas. Sólo The Cat API acepta clave, y es opcional.

| Fuente | Qué aporta | Clave |
| --- | --- | --- |
| `dogapi.dog/api/v2/breeds` | 283 razas: descripción, esperanza de vida, **peso separado por macho y hembra**, hipoalergénico y grupo | No |
| `dogapi.dog/api/v2/facts` | Curiosidades caninas para el bloque «¿Sabías que…?» del mural | No |
| `dog.ceo/api` | Fotos por raza, como relleno cuando la mascota aún no tiene la suya | No |
| `api.thecatapi.com/v1/breeds` | Razas de gato con rasgos puntuados del 1 al 5 (energía, cepillado, muda, problemas de salud, sociabilidad…) | Opcional |

> **Nota:** el proyecto usaba The Dog API (`api.thedogapi.com`), pero desde 2026
> responde **403 sin clave**. Se sustituyó por dogapi.dog, que además da los
> datos ya en números y separa el peso por sexo. Si vuelves a necesitarla,
> ten en cuenta que exigirá registro.

Ninguna de estas llamadas puede tumbar una página: todas tienen tiempo máximo
de 8 s, caché (una semana las razas, un día las curiosidades) y devuelven
`null` o `[]` ante cualquier fallo.

Lo que **no** existe gratis y habría que llevar como datos propios:
calendarios de vacunación, alimentos tóxicos y dosis de medicamentos.

## Decisiones que conviene conocer

- **Sin autenticación, de momento.** Todo se atribuye a `APP_DEFAULT_OWNER_ID`
  y el acceso va con la clave `service_role` desde el servidor. El esquema ya
  tiene RLS con políticas por `auth.uid()` listas: cuando se añada login, hay
  que cambiar `getCurrentOwnerId()` y pasar las consultas de
  `lib/supabase/admin.ts` a `lib/supabase/server.ts`. Los puntos a revisar
  están marcados con `TODO(auth)`.
- **Las fotos se guardan en `public/uploads/` por defecto.** Eso **no funciona
  en Vercel** ni en ningún entorno con sistema de archivos de sólo lectura:
  ahí hay que poner `STORAGE_DRIVER="supabase"` y crear el bucket. El
  contrato está en `src/lib/storage/types.ts`, así que añadir S3 o R2 es
  implementar dos métodos.
- **Las tomas de medicación se planifican con 30 días de antelación** al
  guardar un tratamiento. La tabla tiene un `unique (medication_id,
  scheduled_at)` y la inserción usa `ignoreDuplicates`, así que regenerar el
  calendario nunca duplica tomas ni pisa las ya administradas.
- **El mural y los listados se renderizan en cada visita**
  (`export const dynamic = "force-dynamic"`). Si no, Next los prerenderizaría
  en el build y los cambios hechos fuera de la app —el SQL Editor, otro
  dispositivo— no se verían.

## Aplicar un diseño encima

La base está pensada para recibir un diseño sin tocar la lógica:

1. **Colores, tipografía y radios** → `src/app/globals.css`. Los tokens
   `--brand`, `--health-*` y los de shadcn están en `:root` y `.dark`; los
   componentes no llevan colores literales.
2. **Animaciones de navegación** → el bloque *View Transitions* del mismo
   archivo (`.nav-forward`, `.nav-back`, `.morph`).
3. **Contenedores** → `src/components/ui/section.tsx` (`Section`,
   `PageHeader`, `EmptyState`).
4. **Más componentes de Aceternity** →
   `npx shadcn@latest add @aceternity/<nombre>`; el registro ya está
   configurado en `components.json`.
