"use client";

/** Borrado de un tratamiento, aislado para no volver de cliente toda la lista. */

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { DangerButton } from "@/components/ui/form-feedback";
import { idleState } from "@/lib/action-result";
import { deleteMedicationAction } from "@/server/actions";

export function MedicationDeleteButton({
  id,
  petId,
  name,
}: {
  id: string;
  petId: string;
  name: string;
}) {
  const [, formAction] = useActionState(deleteMedicationAction, idleState);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="petId" value={petId} />
      <DangerButton
        confirmMessage={`¿Eliminar el tratamiento «${name}» y sus tomas?`}
        className="h-8 px-2"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        <span className="sr-only">Eliminar tratamiento {name}</span>
      </DangerButton>
    </form>
  );
}
