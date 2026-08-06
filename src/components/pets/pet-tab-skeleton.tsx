/**
 * Esqueletos de las pestañas de la ficha.
 *
 * Existen por una razón concreta de Next 16: las pestañas son rutas dinámicas
 * —entran con `cookies()` a través del cliente de Supabase— y una ruta dinámica
 * SIN `loading.tsx` no se precarga y no guarda caché de cliente. Sin esto, cada
 * clic en una pestaña se queda con el contenido de la anterior en pantalla
 * hasta que el servidor termina de responder, y volver a una pestaña ya vista
 * la pide entera otra vez.
 *
 * Con un `loading.tsx` por pestaña, Next precarga la frontera de carga y el
 * cambio de pestaña pinta el esqueleto al instante mientras el contenido llega
 * por streaming.
 *
 * El dibujo imita el de cada pestaña —mismas alturas, mismo ritmo de bloques—
 * para que el relevo no dé un salto cuando entran los datos.
 */

import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";

export { Skeleton };

/** Una sección con su título ya escrito y el cuerpo aún por llegar. */
export function SectionSkeleton({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return <Section title={title}>{children}</Section>;
}

/** Lista de filas, el patrón de padecimientos, historial y tratamientos. */
export function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

/** Formulario: unos cuantos campos y el botón. */
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-32" />
    </div>
  );
}

/**
 * Rejilla de indicadores de salud del Resumen.
 *
 * Mismo dibujo que <HealthIndicatorGrid> para que no salte al llegar los
 * datos: filete de 1px entre celdas y nada de bordes por tarjeta.
 */
export function IndicatorGridSkeleton() {
  return (
    <div
      className="bg-border border-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="bg-card flex h-32 flex-col gap-3 p-4">
          <Skeleton className="size-8" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Rejilla de imágenes de la galería. */
export function GridSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: items }).map((_, index) => (
        <Skeleton key={index} className="aspect-square w-full" />
      ))}
    </div>
  );
}
