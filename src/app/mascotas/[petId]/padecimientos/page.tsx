import { notFound } from "next/navigation";

import { ConditionForm } from "@/components/conditions/condition-form";
import { ConditionList } from "@/components/conditions/condition-list";
import { Section } from "@/components/ui/section";
import { getPetDossier } from "@/server/queries";

export const metadata = { title: "Padecimientos" };

export default async function PetConditionsPage({
  params,
}: PageProps<"/mascotas/[petId]/padecimientos">) {
  const { petId } = await params;
  const dossier = await getPetDossier(petId);
  if (!dossier) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Registrar padecimiento"
        description="Alergias, enfermedades crónicas, lesiones… todo lo que conviene tener a mano en una consulta."
      >
        <ConditionForm petId={petId} />
      </Section>

      <ConditionList conditions={dossier.conditions} petId={petId} />
    </div>
  );
}
