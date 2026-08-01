import { notFound } from "next/navigation";

import { WeightForm } from "@/components/weights/weight-form";
import { WeightList } from "@/components/weights/weight-list";
import { WeightChart } from "@/components/health/weight-chart";
import { Section } from "@/components/ui/section";
import { getPetDossier } from "@/server/queries";
import { resolveBreedProfile } from "@/services/breeds";

export const metadata = { title: "Peso" };

export default async function PetWeightPage({ params }: PageProps<"/mascotas/[petId]/peso">) {
  const { petId } = await params;
  const dossier = await getPetDossier(petId);
  if (!dossier) notFound();

  const breed = await resolveBreedProfile(
    dossier.pet.species,
    dossier.pet.breedRefId,
    dossier.pet.breed,
  );

  return (
    <div className="flex flex-col gap-6">
      <Section title="Evolución">
        <WeightChart entries={dossier.weights} breedRange={breed?.weightRange ?? null} />
      </Section>

      <Section
        title="Registrar peso"
        description="Anótalo cada pocas semanas: la tendencia avisa antes que un valor suelto."
      >
        <WeightForm petId={petId} />
      </Section>

      <Section title="Historial">
        <WeightList weights={dossier.weights} petId={petId} />
      </Section>
    </div>
  );
}
