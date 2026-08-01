/**
 * Enumeraciones del dominio.
 *
 * Cada enumeración se declara una sola vez como tupla `as const` y de ahí se
 * derivan: el tipo de TypeScript, el esquema de zod (src/domain/schemas.ts),
 * el tipo de columna en Postgres (supabase/migrations) y las etiquetas que ve
 * el usuario. Añadir un valor nuevo se hace en un único sitio.
 */

// --- Mascota ---------------------------------------------------------------

export const SPECIES = ["dog", "cat", "rabbit", "bird", "rodent", "reptile", "other"] as const;
export type Species = (typeof SPECIES)[number];

export const SPECIES_LABELS: Record<Species, string> = {
  dog: "Perro",
  cat: "Gato",
  rabbit: "Conejo",
  bird: "Ave",
  rodent: "Roedor",
  reptile: "Reptil",
  other: "Otra",
};

export const SEXES = ["male", "female", "unknown"] as const;
export type Sex = (typeof SEXES)[number];

export const SEX_LABELS: Record<Sex, string> = {
  male: "Macho",
  female: "Hembra",
  unknown: "Sin definir",
};

/** Tamaño de la raza. Determina a qué edad la mascota se considera senior. */
export const SIZES = ["small", "medium", "large", "giant"] as const;
export type Size = (typeof SIZES)[number];

export const SIZE_LABELS: Record<Size, string> = {
  small: "Pequeño",
  medium: "Mediano",
  large: "Grande",
  giant: "Gigante",
};

// --- Padecimientos ---------------------------------------------------------

export const CONDITION_CATEGORIES = [
  "chronic",
  "acute",
  "allergy",
  "injury",
  "infection",
  "parasite",
  "dental",
  "behavioral",
  "other",
] as const;
export type ConditionCategory = (typeof CONDITION_CATEGORIES)[number];

export const CONDITION_CATEGORY_LABELS: Record<ConditionCategory, string> = {
  chronic: "Crónico",
  acute: "Agudo",
  allergy: "Alergia",
  injury: "Lesión",
  infection: "Infección",
  parasite: "Parásitos",
  dental: "Dental",
  behavioral: "Conductual",
  other: "Otro",
};

export const CONDITION_STATUSES = ["active", "in_treatment", "controlled", "resolved"] as const;
export type ConditionStatus = (typeof CONDITION_STATUSES)[number];

export const CONDITION_STATUS_LABELS: Record<ConditionStatus, string> = {
  active: "Activo",
  in_treatment: "En tratamiento",
  controlled: "Controlado",
  resolved: "Resuelto",
};

export const SEVERITIES = ["mild", "moderate", "severe"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  mild: "Leve",
  moderate: "Moderado",
  severe: "Grave",
};

// --- Medicamentos ----------------------------------------------------------

export const MEDICATION_ROUTES = [
  "oral",
  "topical",
  "injection",
  "ophthalmic",
  "otic",
  "inhaled",
  "other",
] as const;
export type MedicationRoute = (typeof MEDICATION_ROUTES)[number];

export const MEDICATION_ROUTE_LABELS: Record<MedicationRoute, string> = {
  oral: "Oral",
  topical: "Tópica",
  injection: "Inyectable",
  ophthalmic: "Oftálmica",
  otic: "Ótica",
  inhaled: "Inhalada",
  other: "Otra",
};

export const DOSE_STATUSES = ["pending", "taken", "skipped", "missed"] as const;
export type DoseStatus = (typeof DOSE_STATUSES)[number];

export const DOSE_STATUS_LABELS: Record<DoseStatus, string> = {
  pending: "Pendiente",
  taken: "Administrada",
  skipped: "Omitida",
  missed: "No administrada",
};

// --- Historia clínica ------------------------------------------------------

export const CLINICAL_EVENT_TYPES = [
  "visit",
  "vaccine",
  "deworming",
  "surgery",
  "lab",
  "imaging",
  "emergency",
  "grooming",
  "note",
] as const;
export type ClinicalEventType = (typeof CLINICAL_EVENT_TYPES)[number];

export const CLINICAL_EVENT_TYPE_LABELS: Record<ClinicalEventType, string> = {
  visit: "Consulta",
  vaccine: "Vacuna",
  deworming: "Desparasitación",
  surgery: "Cirugía",
  lab: "Análisis",
  imaging: "Imagenología",
  emergency: "Urgencia",
  grooming: "Aseo",
  note: "Nota",
};

// --- Recordatorios ---------------------------------------------------------

export const REMINDER_TYPES = [
  "medication",
  "vaccine",
  "deworming",
  "checkup",
  "birthday",
  "custom",
] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  medication: "Medicamento",
  vaccine: "Vacuna",
  deworming: "Desparasitación",
  checkup: "Revisión",
  birthday: "Cumpleaños",
  custom: "Personalizado",
};

export const RECURRENCES = [
  "none",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "biannual",
  "yearly",
] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  none: "Una vez",
  daily: "Cada día",
  weekly: "Cada semana",
  biweekly: "Cada dos semanas",
  monthly: "Cada mes",
  quarterly: "Cada tres meses",
  biannual: "Cada seis meses",
  yearly: "Cada año",
};

/** Cuántos días avanza cada recurrencia. `none` no se repite. */
export const RECURRENCE_DAYS: Record<Recurrence, number | null> = {
  none: null,
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 91,
  biannual: 182,
  yearly: 365,
};

// --- Indicadores de salud --------------------------------------------------

/** Semáforo con el que se pinta cualquier indicador calculado. */
export const HEALTH_LEVELS = ["good", "watch", "alert", "unknown"] as const;
export type HealthLevel = (typeof HEALTH_LEVELS)[number];

export const HEALTH_LEVEL_LABELS: Record<HealthLevel, string> = {
  good: "Correcto",
  watch: "Vigilar",
  alert: "Atención",
  unknown: "Sin datos",
};

/** Etapa vital, derivada de la edad, la especie y el tamaño de la raza. */
export const LIFE_STAGES = ["baby", "junior", "adult", "mature", "senior"] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

export const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  baby: "Cachorro",
  junior: "Joven",
  adult: "Adulto",
  mature: "Maduro",
  senior: "Senior",
};
