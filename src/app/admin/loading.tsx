import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";

/**
 * Sólo el contenido: la cabecera y las pestañas del panel las pinta
 * `admin/layout.tsx`, que queda por encima de esta frontera.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      {/* Mismo dibujo que la rejilla de cifras: filete de 1px entre celdas. */}
      <dl className="bg-border border-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-card flex flex-col gap-2 p-4">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </dl>

      <Skeleton className="h-4 w-full max-w-2xl" />
      <ListSkeleton />
    </div>
  );
}
