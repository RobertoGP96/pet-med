"use client";

/**
 * Formulario de registro.
 *
 * Si el proyecto de Supabase tiene la confirmación por correo activada —lo está
 * por defecto—, `signUpAction` no abre sesión: devuelve un mensaje de éxito
 * pidiendo que se abra el enlace del correo. Por eso el formulario se oculta
 * cuando la acción termina bien: dejarlo visible invitaría a registrarse otra
 * vez pensando que no funcionó.
 */

import { useActionState } from "react";
import { MailCheck } from "lucide-react";

import { Field, TextInput } from "@/components/ui/field";
import { FormFeedback, SubmitButton } from "@/components/ui/form-feedback";
import { idleState } from "@/lib/action-result";
import { signUpAction } from "@/server/actions";

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, idleState);

  if (state.status === "success") {
    return (
      <div className="border-health-good/30 bg-health-good/10 flex flex-col items-center gap-3 rounded-lg border px-5 py-8 text-center">
        <MailCheck className="text-health-good size-8" aria-hidden="true" />
        <p className="font-extrabold tracking-[-0.02em]">Ya casi está</p>
        <p className="text-muted-foreground text-sm text-pretty">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field
        name="displayName"
        label="Tu nombre"
        required
        errors={state.fieldErrors}
        hint="Es como te saludará la aplicación."
      >
        <TextInput autoComplete="name" autoFocus placeholder="Ana" />
      </Field>

      <Field name="email" label="Correo" required errors={state.fieldErrors}>
        <TextInput
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          autoCapitalize="none"
          spellCheck={false}
        />
      </Field>

      <Field
        name="password"
        label="Contraseña"
        required
        errors={state.fieldErrors}
        hint="Al menos 8 caracteres."
      >
        <TextInput type="password" autoComplete="new-password" />
      </Field>

      <Field name="passwordConfirm" label="Repite la contraseña" required errors={state.fieldErrors}>
        <TextInput type="password" autoComplete="new-password" />
      </Field>

      <FormFeedback state={state} />

      <SubmitButton className="w-full" pendingLabel="Creando la cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
