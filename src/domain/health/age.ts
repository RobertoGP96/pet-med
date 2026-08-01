/**
 * Edad, etapa vital y cumpleaños.
 *
 * Todas las funciones reciben `now` de forma explícita: el dominio nunca lee
 * el reloj por su cuenta, así los cálculos son deterministas y testeables.
 */

import { differenceInCalendarDays, differenceInMonths, parseISO } from "date-fns";

import type { LifeStage, Size, Species } from "../enums";
import type { DateOnly } from "../types";

export interface Age {
  years: number;
  /** Meses restantes tras descontar los años completos (0-11). */
  months: number;
  totalMonths: number;
  totalDays: number;
}

/** Convierte `YYYY-MM-DD` a un `Date` en medianoche local. */
export function parseDateOnly(date: DateOnly): Date {
  return parseISO(date);
}

export function getAge(birthDate: DateOnly, now: Date): Age {
  const birth = parseDateOnly(birthDate);
  const totalMonths = Math.max(0, differenceInMonths(now, birth));

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    totalMonths,
    totalDays: Math.max(0, differenceInCalendarDays(now, birth)),
  };
}

/**
 * Umbrales de etapa vital en meses, ordenados de menor a mayor.
 *
 * Los perros cambian de etapa antes cuanto más grandes son: un gran danés es
 * senior a los 7 años y un chihuahua no lo es hasta los 11. Valores alineados
 * con las guías de etapas vitales de WSAVA/AAHA.
 */
const LIFE_STAGE_THRESHOLDS: Record<string, { baby: number; junior: number; adult: number; mature: number }> = {
  "dog:small": { baby: 9, junior: 12, adult: 96, mature: 132 },
  "dog:medium": { baby: 12, junior: 18, adult: 84, mature: 120 },
  "dog:large": { baby: 15, junior: 24, adult: 72, mature: 96 },
  "dog:giant": { baby: 18, junior: 24, adult: 60, mature: 84 },
  cat: { baby: 6, junior: 24, adult: 84, mature: 132 },
  default: { baby: 6, junior: 12, adult: 84, mature: 120 },
};

function thresholdsFor(species: Species, size: Size | null) {
  if (species === "dog") {
    return LIFE_STAGE_THRESHOLDS[`dog:${size ?? "medium"}`] ?? LIFE_STAGE_THRESHOLDS["dog:medium"];
  }
  if (species === "cat") return LIFE_STAGE_THRESHOLDS.cat;
  return LIFE_STAGE_THRESHOLDS.default;
}

export function getLifeStage(species: Species, ageMonths: number, size: Size | null): LifeStage {
  const t = thresholdsFor(species, size);

  if (ageMonths < t.baby) return "baby";
  if (ageMonths < t.junior) return "junior";
  if (ageMonths < t.adult) return "adult";
  if (ageMonths < t.mature) return "mature";
  return "senior";
}

/**
 * Edad humana equivalente.
 *
 * Perros: fórmula epigenética de Wang et al. (2020), `16 · ln(edad) + 31`,
 * válida a partir del primer año. Por debajo se interpola linealmente hasta
 * los 31 "años humanos" que corresponden al primer cumpleaños.
 *
 * Gatos: escala clínica habitual — 15 el primer año, 24 el segundo y +4 por
 * cada año adicional.
 *
 * Otras especies: no hay una equivalencia aceptada, se devuelve `null` en vez
 * de inventar un número.
 */
export function getHumanAgeEquivalent(species: Species, ageYears: number): number | null {
  if (ageYears < 0) return null;

  if (species === "dog") {
    if (ageYears < 1) return Math.round(ageYears * 31);
    return Math.round(16 * Math.log(ageYears) + 31);
  }

  if (species === "cat") {
    if (ageYears < 1) return Math.round(ageYears * 15);
    if (ageYears < 2) return Math.round(15 + (ageYears - 1) * 9);
    return Math.round(24 + (ageYears - 2) * 4);
  }

  return null;
}

export interface NextBirthday {
  date: Date;
  daysUntil: number;
  /** Años que cumple. */
  turningAge: number;
  isToday: boolean;
}

export function getNextBirthday(birthDate: DateOnly, now: Date): NextBirthday {
  const birth = parseDateOnly(birthDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let next = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate());
  }

  const daysUntil = differenceInCalendarDays(next, today);

  return {
    date: next,
    daysUntil,
    turningAge: next.getFullYear() - birth.getFullYear(),
    isToday: daysUntil === 0,
  };
}

/**
 * Porcentaje de vida recorrido según la esperanza de vida de la raza.
 * Devuelve `null` si no se conoce la esperanza de vida.
 */
export function getLifeProgress(ageYears: number, lifeExpectancyYears: number | null): number | null {
  if (!lifeExpectancyYears || lifeExpectancyYears <= 0) return null;
  return Math.min(100, Math.round((ageYears / lifeExpectancyYears) * 100));
}
