import { FormSkeleton, RowsSkeleton, SectionSkeleton } from "@/components/pets/pet-tab-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <SectionSkeleton title="Registrar padecimiento">
        <FormSkeleton />
      </SectionSkeleton>

      <SectionSkeleton title="Padecimientos">
        <RowsSkeleton />
      </SectionSkeleton>
    </div>
  );
}
