import { notFound } from "next/navigation";

import { DoseList } from "@/components/medications/dose-list";
import { MedicationForm } from "@/components/medications/medication-form";
import { MedicationList } from "@/components/medications/medication-list";
import { Section } from "@/components/ui/section";
import { getPetMedications } from "@/server/queries";

export const metadata = { title: "Medicamentos" };

export default async function PetMedicationsPage({
  params,
}: PageProps<"/mascotas/[petId]/medicamentos">) {
  const { petId } = await params;
  const result = await getPetMedications(petId);
  if (!result) notFound();

  const { medications, doses, conditions } = result.data;

  return (
    <div className="flex flex-col gap-6">
      <Section title="Control de tomas" description="Lo que toca ahora y lo que quedó sin registrar.">
        <DoseList doses={doses} medications={medications} petId={petId} />
      </Section>

      <Section
        title="Nuevo tratamiento"
        description="Al guardarlo se planifican automáticamente las tomas de los próximos 30 días."
      >
        <MedicationForm petId={petId} conditions={conditions} />
      </Section>

      <MedicationList
        medications={medications}
        conditions={conditions}
        doses={doses}
        petId={petId}
      />
    </div>
  );
}
