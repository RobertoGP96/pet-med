/**
 * Análisis de peso y condición corporal.
 *
 * La pérdida de peso no intencionada es uno de los primeros signos de
 * enfermedad en perros y gatos, por eso el foco está en la *tendencia* y no
 * sólo en el último valor registrado.
 */

import { differenceInCalendarDays } from "date-fns";

import type { HealthLevel } from "../enums";
import type { WeightEntry } from "../types";
import { parseDateOnly } from "./age";

/** Ordena de más antiguo a más reciente. */
export function sortWeightsAscending(entries: WeightEntry[]): WeightEntry[] {
  return [...entries].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

export function getLatestWeight(entries: WeightEntry[]): WeightEntry | null {
  const sorted = sortWeightsAscending(entries);
  return sorted.at(-1) ?? null;
}

export interface WeightTrend {
  latest: WeightEntry;
  previous: WeightEntry | null;
  changeKg: number;
  changePercent: number;
  direction: "up" | "down" | "stable";
  /** Días entre las dos mediciones comparadas. */
  spanDays: number;
  level: HealthLevel;
  message: string;
}

/**
 * Compara la última medición con la más reciente de hace al menos
 * `windowDays` días. Si no hay histórico suficiente, compara con la anterior.
 *
 * Umbral clínico: una variación de peso corporal superior al 5 % sin causa
 * conocida merece consulta veterinaria; a partir del 10 % es prioritaria.
 */
export function getWeightTrend(entries: WeightEntry[], now: Date, windowDays = 90): WeightTrend | null {
  const sorted = sortWeightsAscending(entries);
  const latest = sorted.at(-1);
  if (!latest) return null;

  const latestDate = parseDateOnly(latest.measuredAt);
  const older = sorted
    .slice(0, -1)
    .reverse()
    .find((entry) => differenceInCalendarDays(latestDate, parseDateOnly(entry.measuredAt)) >= windowDays);

  const previous = older ?? sorted.at(-2) ?? null;

  if (!previous) {
    return {
      latest,
      previous: null,
      changeKg: 0,
      changePercent: 0,
      direction: "stable",
      spanDays: 0,
      level: "unknown",
      message: "Registra un segundo peso para ver la tendencia.",
    };
  }

  const changeKg = Number((latest.weightKg - previous.weightKg).toFixed(2));
  const changePercent = Number(((changeKg / previous.weightKg) * 100).toFixed(1));
  const magnitude = Math.abs(changePercent);
  const spanDays = differenceInCalendarDays(latestDate, parseDateOnly(previous.measuredAt));

  const direction = magnitude < 1 ? "stable" : changeKg > 0 ? "up" : "down";

  let level: HealthLevel = "good";
  let message = "El peso se mantiene estable.";

  if (magnitude >= 10) {
    level = "alert";
    message =
      direction === "down"
        ? "Pérdida de peso importante. Consulta al veterinario."
        : "Aumento de peso importante. Revisa la dieta con el veterinario.";
  } else if (magnitude >= 5) {
    level = "watch";
    message =
      direction === "down"
        ? "Está perdiendo peso. Vigila el apetito y la actividad."
        : "Está ganando peso. Revisa las raciones y el ejercicio.";
  }

  return { latest, previous, changeKg, changePercent, direction, spanDays, level, message };
}

export interface BcsAssessment {
  score: number;
  label: string;
  level: HealthLevel;
  /** Desviación estimada sobre el peso ideal, en porcentaje. */
  excessPercent: number;
}

/**
 * Interpreta el Body Condition Score de 9 puntos (escala Purina/WSAVA).
 * 4-5 es el rango ideal; cada punto por encima equivale a ~10 % de exceso.
 */
export function assessBodyCondition(score: number): BcsAssessment {
  const clamped = Math.min(9, Math.max(1, Math.round(score)));
  const excessPercent = (clamped - 5) * 10;

  if (clamped <= 2) {
    return { score: clamped, label: "Muy delgado", level: "alert", excessPercent };
  }
  if (clamped === 3) {
    return { score: clamped, label: "Delgado", level: "watch", excessPercent };
  }
  if (clamped <= 5) {
    return { score: clamped, label: "Ideal", level: "good", excessPercent };
  }
  if (clamped === 6) {
    return { score: clamped, label: "Ligero sobrepeso", level: "watch", excessPercent };
  }
  if (clamped === 7) {
    return { score: clamped, label: "Sobrepeso", level: "watch", excessPercent };
  }
  return { score: clamped, label: "Obesidad", level: "alert", excessPercent };
}

/**
 * Estima el peso ideal a partir del peso actual y el BCS.
 * Fórmula clínica habitual: `ideal = actual / (1 + 0,1 · (BCS − 5))`.
 */
export function estimateIdealWeight(weightKg: number, bodyConditionScore: number): number {
  const clamped = Math.min(9, Math.max(1, Math.round(bodyConditionScore)));
  const factor = 1 + 0.1 * (clamped - 5);
  return Number((weightKg / factor).toFixed(2));
}

export interface BreedWeightRange {
  minKg: number;
  maxKg: number;
}

export interface BreedWeightComparison {
  level: HealthLevel;
  label: string;
  /** Posición dentro del rango, 0 = mínimo, 1 = máximo. Fuera de [0,1] si se sale. */
  position: number;
}

/** Sitúa el peso actual dentro del rango típico de la raza. */
export function compareWithBreedRange(
  weightKg: number,
  range: BreedWeightRange | null,
): BreedWeightComparison | null {
  if (!range || range.maxKg <= range.minKg) return null;

  const position = (weightKg - range.minKg) / (range.maxKg - range.minKg);

  // Un 15 % de margen sobre el rango de la raza antes de marcar alerta: los
  // rangos publicados son orientativos y no distinguen sexo ni castración.
  const lowerAlert = range.minKg * 0.85;
  const upperAlert = range.maxKg * 1.15;

  if (weightKg < lowerAlert) {
    return { level: "alert", label: "Por debajo del rango de su raza", position };
  }
  if (weightKg < range.minKg) {
    return { level: "watch", label: "Algo por debajo del rango de su raza", position };
  }
  if (weightKg > upperAlert) {
    return { level: "alert", label: "Por encima del rango de su raza", position };
  }
  if (weightKg > range.maxKg) {
    return { level: "watch", label: "Algo por encima del rango de su raza", position };
  }
  return { level: "good", label: "Dentro del rango de su raza", position };
}
