import { notFound } from "next/navigation";

import { ConditionForm } from "@/components/conditions/condition-form";
import { ConditionList } from "@/components/conditions/condition-list";
import { Section } from "@/components/ui/section";
import { getPetConditions } from "@/server/queries";

export const metadata = { title: "Padecimientos" };

export default async function PetConditionsPage({
  params,
}: PageProps<"/mascotas/[petId]/padecimientos">) {
  const { petId } = await params;
  const result = await getPetConditions(petId);
  if (!result) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Registrar padecimiento"
        description="Alergias, enfermedades crónicas, lesiones… todo lo que conviene tener a mano en una consulta."
      >
        <ConditionForm petId={petId} />
      </Section>

      <ConditionList conditions={result.data} petId={petId} />
    </div>
  );
}
