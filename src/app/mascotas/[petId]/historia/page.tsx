import { notFound } from "next/navigation";

import { ClinicalEventForm } from "@/components/events/clinical-event-form";
import { ClinicalTimeline } from "@/components/events/clinical-timeline";
import { Section } from "@/components/ui/section";
import { getPetDossier } from "@/server/queries";

export const metadata = { title: "Historia clínica" };

export default async function PetHistoryPage({
  params,
}: PageProps<"/mascotas/[petId]/historia">) {
  const { petId } = await params;
  const dossier = await getPetDossier(petId);
  if (!dossier) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Añadir a la historia"
        description="Consultas, vacunas, desparasitaciones, cirugías y análisis. Anota la fecha del próximo refuerzo para que los indicadores lo vigilen."
      >
        <ClinicalEventForm petId={petId} />
      </Section>

      <Section title="Historial">
        <ClinicalTimeline events={dossier.events} petId={petId} />
      </Section>
    </div>
  );
}
