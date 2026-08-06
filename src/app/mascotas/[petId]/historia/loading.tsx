import { FormSkeleton, RowsSkeleton, SectionSkeleton } from "@/components/pets/pet-tab-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <SectionSkeleton title="Añadir a la historia">
        <FormSkeleton fields={4} />
      </SectionSkeleton>

      <SectionSkeleton title="Historial">
        <RowsSkeleton rows={4} />
      </SectionSkeleton>
    </div>
  );
}
