/**
 * Construcción de los indicadores de salud que se muestran en la ficha.
 *
 * Cada indicador es un dato *derivado*: no se guarda en base de datos, se
 * calcula a partir de lo que la persona usuaria ha ido registrando más el
 * perfil de raza obtenido de la API pública. Si falta información, el
 * indicador se declara `unknown` y explica qué registrar para obtenerlo, en
 * lugar de desaparecer o mostrar un dato inventado.
 */

import type { HealthLevel } from "../enums";
import type { BreedProfile } from "../breed";
import { getAverageLifeSpan, getWeightRangeForSex } from "../breed";
import type { ClinicalEvent, Condition, Medication, MedicationDose, Pet, WeightEntry } from "../types";
import { getAge, getHumanAgeEquivalent, getLifeProgress, getLifeStage, getNextBirthday } from "./age";
import { getAdherence, isMedicationCurrent } from "./medication";
import { getDaysSinceLastVetVisit, getPreventionStatus } from "./prevention";
import { assessBodyCondition, compareWithBreedRange, estimateIdealWeight, getLatestWeight, getWeightTrend } from "./weight";
import { LIFE_STAGE_LABELS } from "../enums";

/** Claves de icono; la UI las traduce a componentes de lucide-react. */
export type HealthIndicatorIcon =
  | "cake"
  | "scale"
  | "activity"
  | "syringe"
  | "shield"
  | "pill"
  | "heart"
  | "stethoscope"
  | "hourglass";

export interface HealthIndicator {
  id: string;
  label: string;
  /** Valor principal, ya formateado para mostrar. */
  value: string;
  /** Explicación o recomendación. */
  detail: string | null;
  level: HealthLevel;
  icon: HealthIndicatorIcon;
  /** Barra de progreso opcional, 0-100. */
  progress: number | null;
}

export interface HealthIndicatorsInput {
  pet: Pet;
  weights: WeightEntry[];
  conditions: Condition[];
  medications: Medication[];
  doses: MedicationDose[];
  events: ClinicalEvent[];
  breed: BreedProfile | null;
  now: Date;
}

function formatKg(value: number): string {
  return `${value.toFixed(2).replace(/\.?0+$/, "").replace(".", ",")} kg`;
}

function formatAge(years: number, months: number): string {
  if (years === 0) return months === 1 ? "1 mes" : `${months} meses`;
  const yearPart = years === 1 ? "1 año" : `${years} años`;
  if (months === 0) return yearPart;
  return `${yearPart} y ${months === 1 ? "1 mes" : `${months} meses`}`;
}

export function buildHealthIndicators(input: HealthIndicatorsInput): HealthIndicator[] {
  const { pet, weights, conditions, medications, doses, events, breed, now } = input;
  const indicators: HealthIndicator[] = [];

  // --- Edad y etapa vital --------------------------------------------------
  if (pet.birthDate) {
    const age = getAge(pet.birthDate, now);
    const ageYears = age.totalMonths / 12;
    const stage = getLifeStage(pet.species, age.totalMonths, pet.size);
    const humanAge = getHumanAgeEquivalent(pet.species, ageYears);

    indicators.push({
      id: "age",
      label: "Edad",
      value: formatAge(age.years, age.months),
      detail: humanAge
        ? `${LIFE_STAGE_LABELS[stage]} · equivale a unos ${humanAge} años humanos`
        : LIFE_STAGE_LABELS[stage],
      level: stage === "senior" ? "watch" : "good",
      icon: "cake",
      progress: null,
    });

    // --- Proporción de vida recorrida --------------------------------------
    const lifeExpectancy = getAverageLifeSpan(breed);
    const lifeProgress = getLifeProgress(ageYears, lifeExpectancy);
    if (lifeProgress != null && lifeExpectancy) {
      indicators.push({
        id: "life-progress",
        label: "Etapa de vida",
        value: `${lifeProgress} %`,
        detail: `La esperanza de vida media de su raza es de ${lifeExpectancy.toFixed(0)} años.`,
        level: lifeProgress > 85 ? "watch" : "good",
        icon: "hourglass",
        progress: lifeProgress,
      });
    }

    // --- Cumpleaños ---------------------------------------------------------
    const birthday = getNextBirthday(pet.birthDate, now);
    indicators.push({
      id: "birthday",
      label: "Cumpleaños",
      value: birthday.isToday
        ? "¡Hoy!"
        : birthday.daysUntil === 1
          ? "Mañana"
          : `En ${birthday.daysUntil} días`,
      detail: birthday.isToday
        ? `${pet.name} cumple ${birthday.turningAge} años.`
        : `Cumplirá ${birthday.turningAge} años.`,
      level: "good",
      icon: "cake",
      progress: null,
    });
  } else {
    indicators.push({
      id: "age",
      label: "Edad",
      value: "Sin datos",
      detail: "Añade la fecha de nacimiento para calcular edad y etapa vital.",
      level: "unknown",
      icon: "cake",
      progress: null,
    });
  }

  // --- Peso y tendencia ----------------------------------------------------
  const latestWeight = getLatestWeight(weights);
  const trend = getWeightTrend(weights, now);

  if (latestWeight && trend) {
    const sign = trend.changeKg > 0 ? "+" : "";
    indicators.push({
      id: "weight",
      label: "Peso",
      value: formatKg(latestWeight.weightKg),
      detail:
        trend.previous && trend.direction !== "stable"
          ? `${sign}${trend.changePercent.toString().replace(".", ",")} % en ${trend.spanDays} días. ${trend.message}`
          : trend.message,
      level: trend.level,
      icon: "scale",
      progress: null,
    });
  } else {
    indicators.push({
      id: "weight",
      label: "Peso",
      value: "Sin datos",
      detail: "Registra el peso para seguir su evolución.",
      level: "unknown",
      icon: "scale",
      progress: null,
    });
  }

  // --- Condición corporal --------------------------------------------------
  if (latestWeight?.bodyConditionScore != null) {
    const bcs = assessBodyCondition(latestWeight.bodyConditionScore);
    const ideal = estimateIdealWeight(latestWeight.weightKg, latestWeight.bodyConditionScore);

    indicators.push({
      id: "body-condition",
      label: "Condición corporal",
      value: `${bcs.score}/9 · ${bcs.label}`,
      detail:
        bcs.level === "good"
          ? "Su condición corporal está en el rango ideal."
          : `Peso ideal estimado: ${formatKg(ideal)}.`,
      level: bcs.level,
      icon: "activity",
      progress: Math.round((bcs.score / 9) * 100),
    });
  }

  // --- Peso frente al rango de la raza -------------------------------------
  // Se usa el rango del sexo de la mascota cuando la fuente lo publica: en
  // razas grandes hay varios kilos de diferencia entre macho y hembra, y con
  // un rango único una hembra sana puede salir marcada como baja de peso.
  const breedRange = getWeightRangeForSex(breed, pet.sex);

  if (latestWeight && breed && breedRange) {
    const comparison = compareWithBreedRange(latestWeight.weightKg, breedRange);
    if (comparison) {
      const usesSexRange = breed.weightBySex != null && (pet.sex === "male" || pet.sex === "female");
      const rangeLabel = `${formatKg(breedRange.minKg)} – ${formatKg(breedRange.maxKg)}`;

      indicators.push({
        id: "breed-weight",
        label: "Peso para su raza",
        value: comparison.label,
        detail: usesSexRange
          ? `Rango típico de ${breed.name} (${pet.sex === "male" ? "macho" : "hembra"}): ${rangeLabel}.`
          : `Rango típico de ${breed.name}: ${rangeLabel}.`,
        level: comparison.level,
        icon: "scale",
        progress: Math.round(Math.min(1, Math.max(0, comparison.position)) * 100),
      });
    }
  }

  // --- Padecimientos activos -----------------------------------------------
  const activeConditions = conditions.filter(
    (condition) => condition.status === "active" || condition.status === "in_treatment",
  );
  const severeCount = activeConditions.filter((condition) => condition.severity === "severe").length;

  indicators.push({
    id: "conditions",
    label: "Padecimientos activos",
    value: activeConditions.length === 0 ? "Ninguno" : String(activeConditions.length),
    detail:
      activeConditions.length === 0
        ? "No hay padecimientos activos registrados."
        : activeConditions.map((condition) => condition.name).join(", "),
    level: severeCount > 0 ? "alert" : activeConditions.length > 0 ? "watch" : "good",
    icon: "heart",
    progress: null,
  });

  // --- Adherencia al tratamiento -------------------------------------------
  const currentMedications = medications.filter((medication) => isMedicationCurrent(medication, now));
  if (currentMedications.length > 0) {
    const currentIds = new Set(currentMedications.map((medication) => medication.id));
    const relevantDoses = doses.filter((dose) => currentIds.has(dose.medicationId));
    const adherence = getAdherence(relevantDoses, now);

    indicators.push({
      id: "adherence",
      label: "Adherencia al tratamiento",
      value: adherence.level === "unknown" ? "Sin datos" : `${adherence.percent} %`,
      detail:
        adherence.level === "unknown"
          ? adherence.message
          : `${adherence.taken} de ${adherence.due} tomas registradas. ${adherence.message}`,
      level: adherence.level,
      icon: "pill",
      progress: adherence.level === "unknown" ? null : adherence.percent,
    });
  }

  // --- Prevención ----------------------------------------------------------
  const vaccination = getPreventionStatus(events, "vaccine", now, "vacunación");
  indicators.push({
    id: "vaccination",
    label: "Vacunación",
    value: vaccinationValue(vaccination.level, vaccination.daysUntilDue),
    detail: vaccination.message,
    level: vaccination.level,
    icon: "syringe",
    progress: null,
  });

  const deworming = getPreventionStatus(events, "deworming", now, "desparasitación");
  indicators.push({
    id: "deworming",
    label: "Desparasitación",
    value: vaccinationValue(deworming.level, deworming.daysUntilDue),
    detail: deworming.message,
    level: deworming.level,
    icon: "shield",
    progress: null,
  });

  // --- Última revisión -----------------------------------------------------
  const daysSinceVisit = getDaysSinceLastVetVisit(events, now);
  indicators.push({
    id: "vet-visit",
    label: "Última revisión",
    value: daysSinceVisit == null ? "Sin datos" : `Hace ${daysSinceVisit} días`,
    detail:
      daysSinceVisit == null
        ? "Registra las consultas veterinarias en la historia clínica."
        : daysSinceVisit > 365
          ? "Ha pasado más de un año desde la última consulta."
          : "Seguimiento veterinario al día.",
    level: daysSinceVisit == null ? "unknown" : daysSinceVisit > 365 ? "watch" : "good",
    icon: "stethoscope",
    progress: null,
  });

  return indicators;
}

function vaccinationValue(level: HealthLevel, daysUntilDue: number | null): string {
  if (level === "unknown") return "Sin datos";
  if (daysUntilDue == null) return "Sin fecha";
  if (daysUntilDue < 0) return "Vencida";
  if (daysUntilDue === 0) return "Hoy";
  return `En ${daysUntilDue} días`;
}

/** Resumen de un solo vistazo: el peor nivel presente manda. */
export function getOverallHealthLevel(indicators: HealthIndicator[]): HealthLevel {
  if (indicators.some((indicator) => indicator.level === "alert")) return "alert";
  if (indicators.some((indicator) => indicator.level === "watch")) return "watch";
  if (indicators.every((indicator) => indicator.level === "unknown")) return "unknown";
  return "good";
}
