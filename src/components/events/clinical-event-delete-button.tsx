"use client";

/** Borrado de un evento clínico, aislado para no volver de cliente la línea de tiempo. */

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { DangerButton } from "@/components/ui/form-feedback";
import { idleState } from "@/lib/action-result";
import { deleteClinicalEventAction } from "@/server/actions";

export function ClinicalEventDeleteButton({
  id,
  petId,
  title,
}: {
  id: string;
  petId: string;
  title: string;
}) {
  const [, formAction] = useActionState(deleteClinicalEventAction, idleState);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="petId" value={petId} />
      <DangerButton
        confirmMessage={`¿Eliminar «${title}» de la historia clínica?`}
        className="h-8 px-2"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        <span className="sr-only">Eliminar {title}</span>
      </DangerButton>
    </form>
  );
}
