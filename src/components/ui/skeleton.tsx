/**
 * Piezas de carga compartidas.
 *
 * Existen por el mismo motivo que los `loading.tsx` que las usan: en Next 16
 * una ruta dinámica SIN frontera de carga no se precarga y no guarda caché de
 * cliente, así que cada clic en el menú se queda con la página anterior en
 * pantalla hasta que el servidor termina. Con la frontera, el esqueleto entra
 * al instante y el contenido llega por streaming.
 *
 * Regla al usarlas: lo que ya se sabe se pinta de verdad —el rótulo y el
 * título de la sección son fijos, no dependen de ninguna consulta—, y sólo se
 * deja en gris lo que hay que ir a buscar. Un esqueleto que también borra el
 * título hace que la navegación parezca un salto a ninguna parte.
 */

import { Eyebrow } from "@/components/ui/section";

/** Bloque gris que late. Es la pieza de la que se componen los demás. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded ${className ?? ""}`} />;
}

/**
 * Cabecera de página con su título ya escrito.
 *
 * Mismo dibujo que <PageHeader> y que las cabeceras a mano de /vacunas, /peso
 * y /fotos: filete inferior, rótulo en versalitas y título grande.
 */
export function PageHeaderSkeleton({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <header className="border-border flex flex-col gap-3 border-b pb-5">
      {eyebrow && <Eyebrow tone="brand">{eyebrow}</Eyebrow>}
      <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">{title}</h1>
      <Skeleton className="h-4 w-full max-w-md" />
    </header>
  );
}

/** Tarjetas apiladas: el patrón de casi todas las vistas transversales. */
export function CardsSkeleton({ cards = 3, height = "h-40" }: { cards?: number; height?: string }) {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      {Array.from({ length: cards }).map((_, index) => (
        <Skeleton key={index} className={`w-full ${height}`} />
      ))}
    </div>
  );
}

/** Filas de una lista: mascotas, recordatorios. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full" />
      ))}
    </div>
  );
}
