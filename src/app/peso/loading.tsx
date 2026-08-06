import { CardsSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeaderSkeleton title="Peso" eyebrow="Seguimiento" />
      {/* Más altas que en otras secciones: cada tarjeta lleva su gráfica. */}
      <CardsSkeleton height="h-64" />
    </div>
  );
}
