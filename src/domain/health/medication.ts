/**
 * Planificación y control de medicamentos.
 *
 * El calendario de tomas se genera de forma determinista a partir del
 * tratamiento (fecha de inicio + intervalo), así regenerarlo nunca duplica
 * tomas ya existentes: para un mismo tratamiento, la misma marca de tiempo.
 */

import { addHours, differenceInCalendarDays, isAfter, isBefore } from "date-fns";

import type { HealthLevel } from "../enums";
import type { DateTime, Medication, MedicationDose } from "../types";
import { parseDateOnly } from "./age";

/** Hora local en la que se ancla la primera toma del día de inicio. */
export const DEFAULT_FIRST_DOSE_HOUR = 8;

/**
 * Genera las marcas de tiempo previstas para un tratamiento dentro de una
 * ventana. Se limita el número de tomas para que un intervalo muy corto y una
 * ventana muy larga no generen una lista inmanejable.
 */
export function generateDoseSchedule(
  medication: Pick<Medication, "startDate" | "endDate" | "intervalHours">,
  from: Date,
  to: Date,
  maxDoses = 400,
): DateTime[] {
  const { startDate, endDate, intervalHours } = medication;
  if (intervalHours <= 0) return [];

  const anchor = parseDateOnly(startDate);
  anchor.setHours(DEFAULT_FIRST_DOSE_HOUR, 0, 0, 0);

  // Fin efectivo: el que llegue antes entre el fin del tratamiento y el fin
  // de la ventana pedida. `endDate` cubre todo su último día.
  let limit = to;
  if (endDate) {
    const treatmentEnd = parseDateOnly(endDate);
    treatmentEnd.setHours(23, 59, 59, 999);
    if (isBefore(treatmentEnd, limit)) limit = treatmentEnd;
  }

  const schedule: DateTime[] = [];
  let cursor = anchor;

  // Salta de golpe hasta el inicio de la ventana en vez de iterar toma a toma.
  if (isBefore(cursor, from)) {
    const elapsedHours = (from.getTime() - cursor.getTime()) / 3_600_000;
    const skipped = Math.floor(elapsedHours / intervalHours);
    cursor = addHours(cursor, skipped * intervalHours);
  }

  while (!isAfter(cursor, limit) && schedule.length < maxDoses) {
    if (!isBefore(cursor, from)) schedule.push(cursor.toISOString());
    cursor = addHours(cursor, intervalHours);
  }

  return schedule;
}

/** Tomas por día que implica un intervalo dado. */
export function dosesPerDay(intervalHours: number): number {
  if (intervalHours <= 0) return 0;
  return Number((24 / intervalHours).toFixed(2));
}

export interface Adherence {
  taken: number;
  missed: number;
  skipped: number;
  /** Tomas que ya deberían haberse administrado. */
  due: number;
  percent: number;
  level: HealthLevel;
  message: string;
}

/**
 * Adherencia al tratamiento en los últimos `windowDays` días.
 * Sólo cuenta tomas cuya hora prevista ya ha pasado: las futuras no penalizan.
 */
export function getAdherence(doses: MedicationDose[], now: Date, windowDays = 30): Adherence {
  const relevant = doses.filter((dose) => {
    const scheduled = new Date(dose.scheduledAt);
    if (isAfter(scheduled, now)) return false;
    return differenceInCalendarDays(now, scheduled) <= windowDays;
  });

  const taken = relevant.filter((dose) => dose.status === "taken").length;
  const skipped = relevant.filter((dose) => dose.status === "skipped").length;
  // Una toma pendiente cuya hora ya pasó cuenta como no administrada.
  const missed = relevant.filter(
    (dose) => dose.status === "missed" || dose.status === "pending",
  ).length;
  const due = relevant.length;

  if (due === 0) {
    return {
      taken: 0,
      missed: 0,
      skipped: 0,
      due: 0,
      percent: 0,
      level: "unknown",
      message: "Todavía no hay tomas registradas.",
    };
  }

  const percent = Math.round((taken / due) * 100);

  let level: HealthLevel = "good";
  let message = "Tratamiento al día.";
  if (percent < 70) {
    level = "alert";
    message = "Se están saltando muchas tomas. Revisa el tratamiento.";
  } else if (percent < 90) {
    level = "watch";
    message = "Hay tomas sin registrar.";
  }

  return { taken, missed, skipped, due, percent, level, message };
}

/** Próxima toma pendiente a partir de `now`. */
export function getNextDose(doses: MedicationDose[], now: Date): MedicationDose | null {
  return (
    doses
      .filter((dose) => dose.status === "pending" && !isBefore(new Date(dose.scheduledAt), now))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0] ?? null
  );
}

/** Tomas pendientes cuya hora ya pasó. */
export function getOverdueDoses(doses: MedicationDose[], now: Date): MedicationDose[] {
  return doses
    .filter((dose) => dose.status === "pending" && isBefore(new Date(dose.scheduledAt), now))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

/** Tomas previstas dentro de las próximas `hours` horas. */
export function getUpcomingDoses(doses: MedicationDose[], now: Date, hours = 24): MedicationDose[] {
  const limit = addHours(now, hours);
  return doses
    .filter((dose) => {
      if (dose.status !== "pending") return false;
      const scheduled = new Date(dose.scheduledAt);
      return !isBefore(scheduled, now) && !isAfter(scheduled, limit);
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

/** ¿El tratamiento sigue vigente hoy? */
export function isMedicationCurrent(medication: Medication, now: Date): boolean {
  if (!medication.isActive) return false;
  const start = parseDateOnly(medication.startDate);
  if (isAfter(start, now)) return false;
  if (!medication.endDate) return true;
  const end = parseDateOnly(medication.endDate);
  end.setHours(23, 59, 59, 999);
  return !isAfter(now, end);
}
