/**
 * Formateo para mostrar. Toda la app está en español, así que el locale se
 * fija aquí en un único sitio en vez de repetir `es` en cada llamada.
 */

import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import type { DateOnly, DateTime } from "@/domain/types";

function toDate(value: string): Date | null {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/** `2026-03-15` -> `15 mar 2026` */
export function formatDate(value: DateOnly | null): string {
  if (!value) return "—";
  const date = toDate(value);
  return date ? format(date, "d MMM yyyy", { locale: es }) : "—";
}

/** `2026-03-15` -> `15 de marzo de 2026` */
export function formatDateLong(value: DateOnly | null): string {
  if (!value) return "—";
  const date = toDate(value);
  return date ? format(date, "d 'de' MMMM 'de' yyyy", { locale: es }) : "—";
}

/** `2026-03-15T09:00:00Z` -> `15 mar, 09:00` */
export function formatDateTime(value: DateTime | null): string {
  if (!value) return "—";
  const date = toDate(value);
  return date ? format(date, "d MMM, HH:mm", { locale: es }) : "—";
}

/** `09:00` */
export function formatTime(value: DateTime | null): string {
  if (!value) return "—";
  const date = toDate(value);
  return date ? format(date, "HH:mm", { locale: es }) : "—";
}

/** `hace 3 días` / `en 2 meses` */
export function formatRelative(value: DateTime | DateOnly | null): string {
  if (!value) return "—";
  const date = toDate(value);
  if (!date) return "—";
  return formatDistanceToNowStrict(date, { locale: es, addSuffix: true });
}

/** Valor para un `<input type="date">`. */
export function toDateInputValue(value: DateOnly | null): string {
  return value ?? "";
}

/** Valor para un `<input type="datetime-local">`, en hora local. */
export function toDateTimeInputValue(value: DateTime | null): string {
  if (!value) return "";
  const date = toDate(value);
  if (!date) return "";
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/** `12.5` -> `12,5 kg` (sin decimales innecesarios). */
export function formatWeight(kg: number | null): string {
  if (kg == null) return "—";
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(kg)} kg`;
}

export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Dosis completa: `2,5 mg`. */
export function formatDose(dose: number, unit: string): string {
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 }).format(dose)} ${unit}`;
}

/** `24` -> `Cada 24 h (1 vez al día)` */
export function formatInterval(intervalHours: number): string {
  if (intervalHours === 24) return "Una vez al día";
  if (intervalHours === 12) return "Cada 12 h (2 veces al día)";
  if (intervalHours === 8) return "Cada 8 h (3 veces al día)";
  if (intervalHours % 24 === 0) {
    const days = intervalHours / 24;
    return `Cada ${days} días`;
  }
  return `Cada ${intervalHours} h`;
}
