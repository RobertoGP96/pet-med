import { GridSkeleton, SectionSkeleton, Skeleton } from "@/components/pets/pet-tab-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <SectionSkeleton title="Subir una foto">
        <Skeleton className="h-32 w-full" />
      </SectionSkeleton>

      <SectionSkeleton title="Galería">
        <GridSkeleton />
      </SectionSkeleton>
    </div>
  );
}
