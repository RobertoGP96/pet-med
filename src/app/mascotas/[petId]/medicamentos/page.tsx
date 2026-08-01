import { notFound } from "next/navigation";

import { DoseList } from "@/components/medications/dose-list";
import { MedicationForm } from "@/components/medications/medication-form";
import { MedicationList } from "@/components/medications/medication-list";
import { Section } from "@/components/ui/section";
import { getPetDossier } from "@/server/queries";

export const metadata = { title: "Medicamentos" };

export default async function PetMedicationsPage({
  params,
}: PageProps<"/mascotas/[petId]/medicamentos">) {
  const { petId } = await params;
  const dossier = await getPetDossier(petId);
  if (!dossier) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Section title="Control de tomas" description="Lo que toca ahora y lo que quedó sin registrar.">
        <DoseList doses={dossier.doses} medications={dossier.medications} petId={petId} />
      </Section>

      <Section
        title="Nuevo tratamiento"
        description="Al guardarlo se planifican automáticamente las tomas de los próximos 30 días."
      >
        <MedicationForm petId={petId} conditions={dossier.conditions} />
      </Section>

      <MedicationList
        medications={dossier.medications}
        conditions={dossier.conditions}
        doses={dossier.doses}
        petId={petId}
      />
    </div>
  );
}
