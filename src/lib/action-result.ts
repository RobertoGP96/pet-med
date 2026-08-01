/**
 * Forma del estado que devuelven las server actions.
 *
 * Todas las acciones devuelven este mismo objeto para que los formularios
 * puedan usar `useActionState` sin adaptadores: los errores por campo se
 * pintan junto al input y `message` alimenta el aviso general.
 */

import type { FieldErrors } from "@/domain/schemas";

export type ActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: FieldErrors;
};

export const idleState: ActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

export function successState(message: string): ActionState {
  return { status: "success", message, fieldErrors: {} };
}

export function errorState(message: string, fieldErrors: FieldErrors = {}): ActionState {
  return { status: "error", message, fieldErrors };
}

/**
 * Traduce un error de Postgres a algo que una persona pueda entender.
 * Los códigos son los de PostgreSQL; Supabase los reenvía tal cual.
 */
export function describeDatabaseError(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "23505":
      return "Ese registro ya existe.";
    case "23503":
      return "El registro al que hace referencia ya no existe.";
    case "23514":
      return "Alguno de los valores no cumple las reglas del registro.";
    case "22P02":
      return "Alguno de los datos tiene un formato incorrecto.";
    case "42501":
      return "No tienes permisos para hacer esta operación.";
    default:
      return `No se pudo guardar: ${error.message}`;
  }
}
