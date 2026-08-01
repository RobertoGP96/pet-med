/**
 * Envoltorio de campo de formulario.
 *
 * Une etiqueta, control, texto de ayuda y error, y se encarga del cableado de
 * accesibilidad que es fácil olvidar: `htmlFor`, `aria-describedby`,
 * `aria-invalid` y `role="alert"` en el mensaje de error.
 *
 * Los errores llegan tal cual los devuelve `ActionState.fieldErrors`, así que
 * un formulario sólo tiene que pasar `errors={state.fieldErrors}`.
 */

import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import type { FieldErrors } from "@/domain/schemas";

interface FieldProps {
  /** Debe coincidir con el `name` del control y con la clave del esquema. */
  name: string;
  label: string;
  children?: React.ReactNode;
  hint?: string;
  required?: boolean;
  errors?: FieldErrors;
  className?: string;
}

export function Field({
  name,
  label,
  children,
  hint,
  required,
  errors,
  className,
}: FieldProps) {
  const fieldErrors = errors?.[name] ?? [];
  const hasError = fieldErrors.length > 0;

  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = hasError ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={name}>
        {label}
        {required && (
          <span className="text-health-alert ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      {/* El control recibe los atributos ARIA sin que cada formulario los
          repita: se clonan sobre el hijo. */}
      {React.isValidElement<Record<string, unknown>>(children)
        ? React.cloneElement(children, {
            id: name,
            name,
            "aria-describedby": describedBy,
            "aria-invalid": hasError || undefined,
            required,
          })
        : children}

      {hint && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}

      {hasError && (
        <p id={errorId} role="alert" className="text-health-alert text-xs font-medium">
          {fieldErrors[0]}
        </p>
      )}
    </div>
  );
}

/** `<select>` con el mismo aspecto que el Input de Aceternity. */
export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "shadow-input dark:placeholder-text-neutral-600 flex h-10 w-full rounded-md border-none bg-gray-50 px-3 py-2 text-sm text-black transition duration-400 group-hover/input:shadow-none file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-400 focus-visible:ring-[2px] focus-visible:ring-neutral-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-white dark:shadow-[0px_0px_1px_1px_#404040] dark:focus-visible:ring-neutral-600",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

/** `<textarea>` a juego con el resto de controles. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "shadow-input dark:placeholder-text-neutral-600 flex w-full rounded-md border-none bg-gray-50 px-3 py-2 text-sm text-black transition duration-400 group-hover/input:shadow-none placeholder:text-neutral-400 focus-visible:ring-[2px] focus-visible:ring-neutral-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-white dark:shadow-[0px_0px_1px_1px_#404040] dark:focus-visible:ring-neutral-600",
          className,
        )}
        {...props}
      />
    );
  },
);

/** Casilla con etiqueta a la derecha. */
export function Checkbox({
  name,
  label,
  defaultChecked,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        id={name}
        name={name}
        defaultChecked={defaultChecked}
        className="accent-brand mt-0.5 size-4 shrink-0 cursor-pointer"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </span>
    </label>
  );
}
