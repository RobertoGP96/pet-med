import { FormSkeleton, RowsSkeleton, SectionSkeleton } from "@/components/pets/pet-tab-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <SectionSkeleton title="Control de tomas">
        <RowsSkeleton />
      </SectionSkeleton>

      <SectionSkeleton title="Nuevo tratamiento">
        <FormSkeleton fields={4} />
      </SectionSkeleton>

      <SectionSkeleton title="Tratamientos">
        <RowsSkeleton />
      </SectionSkeleton>
    </div>
  );
}
