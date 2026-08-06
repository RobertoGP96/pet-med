import {
  FormSkeleton,
  RowsSkeleton,
  SectionSkeleton,
  Skeleton,
} from "@/components/pets/pet-tab-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <SectionSkeleton title="Evolución">
        <Skeleton className="h-56 w-full" />
      </SectionSkeleton>

      <SectionSkeleton title="Registrar peso">
        <FormSkeleton fields={2} />
      </SectionSkeleton>

      <SectionSkeleton title="Historial">
        <RowsSkeleton />
      </SectionSkeleton>
    </div>
  );
}
