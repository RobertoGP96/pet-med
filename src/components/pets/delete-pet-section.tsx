"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { DangerButton, FormFeedback } from "@/components/ui/form-feedback";
import { Section } from "@/components/ui/section";
import { idleState } from "@/lib/action-result";
import { deletePetAction } from "@/server/actions";

/** Zona de peligro: borrar la ficha se lleva por delante todo su historial. */
export function DeletePetSection({ petId, petName }: { petId: string; petName: string }) {
  const [state, formAction] = useActionState(deletePetAction, idleState);

  return (
    <Section
      title="Borrar ficha"
      description="Se eliminarán también sus pesos, padecimientos, tratamientos, historia clínica, fotos y recordatorios. No se puede deshacer."
      className="border-health-alert/30"
    >
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="petId" value={petId} />
        <FormFeedback state={state} />
        <DangerButton
          confirmMessage={`¿Seguro que quieres borrar la ficha de ${petName} y todo su historial? Esta acción no se puede deshacer.`}
          className="border-health-alert/40 self-start border font-extrabold"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Borrar la ficha de {petName}
        </DangerButton>
      </form>
    </Section>
  );
}
