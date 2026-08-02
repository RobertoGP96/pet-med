"use client";

/**
 * Borrado de un pesaje. Vive en su propio archivo de cliente para que la lista
 * de pesos siga siendo un componente de servidor.
 */

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { DangerButton } from "@/components/ui/form-feedback";
import { idleState } from "@/lib/action-result";
import { deleteWeightAction } from "@/server/actions";

export function WeightDeleteButton({ id, petId }: { id: string; petId: string }) {
  const [, formAction] = useActionState(deleteWeightAction, idleState);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="petId" value={petId} />
      <DangerButton confirmMessage="¿Eliminar este registro de peso?" className="h-8 px-2">
        <Trash2 className="size-4" aria-hidden="true" />
        <span className="sr-only">Eliminar registro de peso</span>
      </DangerButton>
    </form>
  );
}
