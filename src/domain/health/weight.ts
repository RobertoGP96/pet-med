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
 * Etiqueta propia de cada punto de la escala: son nueve grados distintos y el
 * desplegable los lista todos, así que no pueden compartir texto. La
 * agrupación clínica vive en `level`, no aquí.
 */
const BCS_LABELS: Record<number, string> = {
  1: "Caquéctico",
  2: "Muy delgado",
  3: "Delgado",
  4: "Ideal (algo justo)",
  5: "Ideal",
  6: "Ligero sobrepeso",
  7: "Sobrepeso",
  8: "Obesidad",
  9: "Obesidad grave",
};

/** Nivel de salud de cada punto: 4-5 ideal, 3/6/7 vigilar, extremos alerta. */
function bcsLevel(score: number): HealthLevel {
  if (score <= 2 || score >= 8) return "alert";
  if (score === 4 || score === 5) return "good";
  return "watch";
}

/**
 * Interpreta el Body Condition Score de 9 puntos (escala Purina/WSAVA).
 * 4-5 es el rango ideal; cada punto por encima equivale a ~10 % de exceso.
 */
export function assessBodyCondition(score: number): BcsAssessment {
  const clamped = Math.min(9, Math.max(1, Math.round(score)));

  return {
    score: clamped,
    label: BCS_LABELS[clamped],
    level: bcsLevel(clamped),
    excessPercent: (clamped - 5) * 10,
  };
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

export interface WeightStatus {
  /** Nivel global: el de la fuente principal, empeorado por la tendencia si toca. */
  level: HealthLevel;
  /** Clasificación corta, p. ej. «Ideal» o «Dentro del rango de su raza». */
  label: string;
  /** Explicación o recomendación, ya redactada para mostrar. */
  message: string;
  /** De dónde sale el veredicto: BCS registrado, rango de raza o nada. */
  source: "bcs" | "breed-range" | "none";
  /** Peso ideal estimado en kilos; sólo se conoce con BCS. */
  idealWeightKg: number | null;
  latest: WeightEntry;
  bcs: BcsAssessment | null;
  breedComparison: BreedWeightComparison | null;
  trend: WeightTrend | null;
}

/** Orden de gravedad para quedarse con el peor nivel. `unknown` no compite. */
const LEVEL_SEVERITY: Record<HealthLevel, number> = { unknown: 0, good: 0, watch: 1, alert: 2 };

/**
 * Veredicto único sobre el estado de peso de la mascota.
 *
 * Prioridad de fuentes: el BCS manda porque es una valoración del animal
 * concreto; sin él se cae al rango de la raza, que es orientativo. La
 * tendencia nunca mejora el veredicto, pero sí lo empeora: un peso «ideal»
 * que está cayendo deprisa sigue siendo motivo de consulta.
 */
export function assessWeightStatus(
  entries: WeightEntry[],
  breedRange: BreedWeightRange | null,
  now: Date,
): WeightStatus | null {
  const latest = getLatestWeight(entries);
  if (!latest) return null;

  const trend = getWeightTrend(entries, now);
  const bcs =
    latest.bodyConditionScore != null ? assessBodyCondition(latest.bodyConditionScore) : null;
  const breedComparison = compareWithBreedRange(latest.weightKg, breedRange);

  let level: HealthLevel;
  let label: string;
  let message: string;
  let source: WeightStatus["source"];
  let idealWeightKg: number | null = null;

  if (bcs) {
    source = "bcs";
    level = bcs.level;
    label = bcs.label;
    idealWeightKg = estimateIdealWeight(latest.weightKg, bcs.score);
    message =
      bcs.level === "good"
        ? "Su condición corporal está en el rango ideal."
        : bcs.excessPercent > 0
          ? `Está en torno a un ${bcs.excessPercent} % por encima de su peso ideal estimado.`
          : `Está en torno a un ${Math.abs(bcs.excessPercent)} % por debajo de su peso ideal estimado.`;
  } else if (breedComparison) {
    source = "breed-range";
    level = breedComparison.level;
    label = breedComparison.label;
    message =
      "Clasificación orientativa según el rango típico de su raza. Registra la condición corporal (BCS) al anotar el peso para afinarla.";
  } else {
    source = "none";
    level = "unknown";
    label = "Sin clasificación";
    message =
      "Registra la condición corporal (BCS) al anotar el peso para clasificar su estado.";
  }

  if (source !== "none" && trend && LEVEL_SEVERITY[trend.level] > LEVEL_SEVERITY[level]) {
    level = trend.level;
    message = `${message} ${trend.message}`;
  }

  return { level, label, message, source, idealWeightKg, latest, bcs, breedComparison, trend };
}
