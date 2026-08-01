"use client";

/**
 * Acciones de un recordatorio: marcarlo hecho y borrarlo.
 *
 * Van en su propio archivo de cliente para que el listado siga siendo un
 * componente de servidor. Son dos formularios hermanos, nunca anidados.
 */

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Trash2 } from "lucide-react";

import { DangerButton } from "@/components/ui/form-feedback";
import { idleState } from "@/lib/action-result";
import { completeReminderAction, deleteReminderAction } from "@/server/actions";
import { cn } from "@/lib/utils";

export function ReminderRowActions({
  id,
  petId,
  title,
}: {
  id: string;
  petId: string;
  title: string;
}) {
  const [, completeAction] = useActionState(completeReminderAction, idleState);
  const [, removeAction] = useActionState(deleteReminderAction, idleState);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <form action={completeAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="petId" value={petId} />
        <CompleteButton title={title} />
      </form>

      <form action={removeAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="petId" value={petId} />
        <DangerButton confirmMessage={`¿Eliminar el recordatorio «${title}»?`} className="h-9 px-2">
          <Trash2 className="size-4" aria-hidden="true" />
          <span className="sr-only">Eliminar {title}</span>
        </DangerButton>
      </form>
    </div>
  );
}

function CompleteButton({ title }: { title: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "border-border inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition",
        "hover:bg-muted focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Check className="size-4" aria-hidden="true" />
      )}
      Hecho
      <span className="sr-only">: {title}</span>
    </button>
  );
}
