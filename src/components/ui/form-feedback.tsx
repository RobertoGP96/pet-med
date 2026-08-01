"use client";

/**
 * Piezas compartidas por todos los formularios con server actions.
 *
 * `SubmitButton` se apoya en `useFormStatus`, que lee el estado del `<form>`
 * padre: por eso tiene que ser un componente aparte y de cliente, no puede
 * vivir dentro del propio formulario.
 */

import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/action-result";

export function SubmitButton({
  children,
  className,
  pendingLabel = "Guardando…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "bg-brand text-brand-foreground inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition",
        "hover:opacity-90 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Aviso general de la acción: el error o el éxito que no cuelga de un campo. */
export function FormFeedback({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;

  const isError = state.status === "error";

  return (
    <p
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
        isError
          ? "bg-health-alert/10 text-health-alert"
          : "bg-health-good/10 text-health-good",
      )}
    >
      {isError ? (
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
      )}
      {state.message}
    </p>
  );
}

/** Botón de una acción destructiva dentro de su propio `<form>`. */
export function DangerButton({
  children,
  confirmMessage,
  className,
}: {
  children: React.ReactNode;
  confirmMessage: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        // Una acción irreversible no se ejecuta sin confirmación explícita.
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      className={cn(
        "text-health-alert hover:bg-health-alert/10 inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition disabled:opacity-60",
        className,
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : children}
    </button>
  );
}
