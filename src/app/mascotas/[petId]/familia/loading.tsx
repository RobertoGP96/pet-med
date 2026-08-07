import { RowsSkeleton, SectionSkeleton, Skeleton } from "@/components/pets/pet-tab-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <SectionSkeleton title="Árbol genealógico">
        <Skeleton className="h-64 w-full" />
      </SectionSkeleton>

      <SectionSkeleton title="Hermanos">
        <RowsSkeleton rows={2} />
      </SectionSkeleton>
    </div>
  );
}
