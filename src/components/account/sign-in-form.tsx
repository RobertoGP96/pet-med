"use client";

/**
 * Formulario de acceso.
 *
 * `siguiente` viaja en un campo oculto: el proxy lo pone en la URL cuando
 * alguien pide una ruta privada sin sesión, y así después de entrar se vuelve a
 * donde se quería ir en vez de aterrizar siempre en el listado. El servidor lo
 * valida antes de usarlo (ver `safeNextPath` en src/server/actions.ts).
 */

import { useActionState } from "react";

import { Field, TextInput } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/ui/form-feedback";
import { idleState } from "@/lib/action-result";
import { signInAction } from "@/server/actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signInAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="siguiente" value={next} />}

      <Field name="email" label="Correo" required errors={state.fieldErrors}>
        <TextInput
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="tu@correo.com"
          // Los navegadores móviles capitalizan la primera letra por su cuenta,
          // y un correo con mayúscula inicial es una fuente clásica de «pero si
          // lo he escrito bien».
          autoCapitalize="none"
          spellCheck={false}
        />
      </Field>

      <Field name="password" label="Contraseña" required errors={state.fieldErrors}>
        <TextInput type="password" autoComplete="current-password" />
      </Field>

      <FormFeedback state={state} />

      <SubmitButton className="w-full" pendingLabel="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  );
}
