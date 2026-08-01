/**
 * Medicina preventiva: vacunas, desparasitaciones y revisiones.
 *
 * Se apoya en `nextDueAt` de los eventos clínicos, que es la fecha que el
 * veterinario indica para el siguiente refuerzo. Si no hay eventos de un tipo,
 * se informa de la ausencia en lugar de asumir que está al día.
 */

import { differenceInCalendarDays } from "date-fns";

import type { ClinicalEventType, HealthLevel } from "../enums";
import type { ClinicalEvent, DateOnly } from "../types";
import { parseDateOnly } from "./age";

export interface PreventionStatus {
  type: ClinicalEventType;
  /** Último evento registrado de este tipo. */
  last: ClinicalEvent | null;
  /** Fecha del próximo refuerzo, si se registró. */
  nextDueAt: DateOnly | null;
  daysUntilDue: number | null;
  level: HealthLevel;
  message: string;
}

/** Días de antelación con los que un refuerzo pasa a estado "vigilar". */
const DUE_SOON_DAYS = 30;

export function getPreventionStatus(
  events: ClinicalEvent[],
  type: ClinicalEventType,
  now: Date,
  label: string,
): PreventionStatus {
  const ofType = events
    .filter((event) => event.type === type)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const last = ofType[0] ?? null;

  if (!last) {
    return {
      type,
      last: null,
      nextDueAt: null,
      daysUntilDue: null,
      level: "unknown",
      message: `Sin registro de ${label}.`,
    };
  }

  // El próximo refuerzo puede haberse anotado en un evento anterior aunque el
  // más reciente no lo lleve, así que se busca la fecha futura más cercana.
  const nextDueAt =
    ofType
      .map((event) => event.nextDueAt)
      .filter((date): date is DateOnly => date != null)
      .sort()
      .at(-1) ?? null;

  if (!nextDueAt) {
    return {
      type,
      last,
      nextDueAt: null,
      daysUntilDue: null,
      level: "watch",
      message: `Sin fecha del próximo refuerzo de ${label}.`,
    };
  }

  const daysUntilDue = differenceInCalendarDays(parseDateOnly(nextDueAt), now);

  if (daysUntilDue < 0) {
    return {
      type,
      last,
      nextDueAt,
      daysUntilDue,
      level: "alert",
      message: `${label} vencida hace ${Math.abs(daysUntilDue)} días.`,
    };
  }

  if (daysUntilDue <= DUE_SOON_DAYS) {
    return {
      type,
      last,
      nextDueAt,
      daysUntilDue,
      level: "watch",
      message: `${label} en ${daysUntilDue} días.`,
    };
  }

  return {
    type,
    last,
    nextDueAt,
    daysUntilDue,
    level: "good",
    message: `${label} al día. Siguiente en ${daysUntilDue} días.`,
  };
}

/** Días desde la última revisión veterinaria de cualquier tipo. */
export function getDaysSinceLastVetVisit(events: ClinicalEvent[], now: Date): number | null {
  const visits = events
    .filter((event) => event.type === "visit" || event.type === "emergency")
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const last = visits[0];
  if (!last) return null;

  return differenceInCalendarDays(now, parseDateOnly(last.occurredAt));
}
