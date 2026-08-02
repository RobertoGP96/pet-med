"use client";

/**
 * Cambio de rol de una cuenta.
 *
 * Ascender a alguien a administrador le da acceso a moderar el mural entero y a
 * cambiar roles ajenos, así que va con confirmación explícita. `DangerButton`
 * ya la trae, y es la misma que protege borrar una mascota.
 *
 * La cuenta propia no se puede degradar: el servidor lo rechaza en
 * `setUserRoleAction`, y aquí ni siquiera se ofrece el botón — pedir algo que
 * va a fallar es una trampa, no una salvaguarda.
 */

import { useActionState } from "react";
import { Shield, ShieldOff } from "lucide-react";

import { DangerButton, FormFeedback } from "@/components/ui/form-feedback";
import { actionStyles } from "@/components/ui/action";
import { idleState } from "@/lib/action-result";
import { setUserRoleAction } from "@/server/actions";
import { cn } from "@/lib/utils";

export function RoleSwitch({
  userId,
  name,
  role,
  isSelf,
}: {
  userId: string;
  name: string;
  role: "user" | "admin";
  isSelf: boolean;
}) {
  const [state, formAction] = useActionState(setUserRoleAction, idleState);

  if (isSelf) {
    return <span className="text-muted-foreground text-xs">Eres tú</span>;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={formAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="role" value={role === "admin" ? "user" : "admin"} />

        {role === "admin" ? (
          <DangerButton confirmMessage={`¿Quitar el rol de administrador a ${name}?`}>
            <ShieldOff className="size-4" aria-hidden="true" />
            Quitar admin
          </DangerButton>
        ) : (
          <button type="submit" className={cn(actionStyles({ variant: "outline", size: "sm" }))}>
            <Shield className="size-4" aria-hidden="true" />
            Hacer admin
          </button>
        )}
      </form>

      <FormFeedback state={state} />
    </div>
  );
}
