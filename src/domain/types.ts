/**
 * Entidades del dominio.
 *
 * Reglas de forma:
 * - Los identificadores son UUID (`string`).
 * - Las fechas *sin hora* (nacimiento, diagnóstico…) son `YYYY-MM-DD`.
 * - Las fechas *con hora* (tomas, eventos…) son ISO 8601 en UTC.
 * - Los campos opcionales en base de datos se representan como `| null`, no
 *   como `?`, para que el compilador obligue a tratar el caso vacío.
 *
 * Estos tipos son la forma que consume la UI. La traducción desde las filas
 * de Postgres (snake_case) vive en src/server/mappers.ts.
 */

import type {
  ClinicalEventType,
  ConditionCategory,
  ConditionStatus,
  DoseStatus,
  MedicationRoute,
  Recurrence,
  ReminderType,
  Severity,
  Sex,
  Size,
  Species,
} from "./enums";

/** `YYYY-MM-DD` */
export type DateOnly = string;
/** ISO 8601 con hora y zona, p. ej. `2026-08-01T09:30:00.000Z` */
export type DateTime = string;

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: Species;
  /** Nombre libre de la raza, tal como lo escribió la persona usuaria. */
  breed: string | null;
  /** Id de la raza en The Dog API / The Cat API, si se seleccionó del catálogo. */
  breedRefId: string | null;
  size: Size | null;
  sex: Sex;
  birthDate: DateOnly | null;
  adoptionDate: DateOnly | null;
  color: string | null;
  microchip: string | null;
  sterilized: boolean;
  /** Texto que acompaña a la mascota en el mural. */
  bio: string | null;
  avatarUrl: string | null;
  /** Si es visible en el mural público. */
  isPublic: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface WeightEntry {
  id: string;
  petId: string;
  measuredAt: DateOnly;
  weightKg: number;
  /** Body Condition Score de 1 a 9; 5 es el peso ideal. */
  bodyConditionScore: number | null;
  notes: string | null;
  createdAt: DateTime;
}

export interface Condition {
  id: string;
  petId: string;
  name: string;
  category: ConditionCategory;
  severity: Severity;
  status: ConditionStatus;
  diagnosedAt: DateOnly;
  resolvedAt: DateOnly | null;
  notes: string | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface Medication {
  id: string;
  petId: string;
  /** Padecimiento que trata este medicamento, si aplica. */
  conditionId: string | null;
  name: string;
  /** Cantidad por toma, p. ej. 2.5 */
  dose: number;
  /** Unidad de la dosis, p. ej. "mg", "ml", "comprimido". */
  doseUnit: string;
  route: MedicationRoute;
  /** Horas entre tomas. 24 = una vez al día, 8 = cada 8 horas. */
  intervalHours: number;
  startDate: DateOnly;
  /** `null` en tratamientos crónicos e indefinidos. */
  endDate: DateOnly | null;
  instructions: string | null;
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

/** Una toma concreta: lo que convierte un tratamiento en un control real. */
export interface MedicationDose {
  id: string;
  medicationId: string;
  petId: string;
  scheduledAt: DateTime;
  takenAt: DateTime | null;
  status: DoseStatus;
  notes: string | null;
  createdAt: DateTime;
}

export interface ClinicalEvent {
  id: string;
  petId: string;
  type: ClinicalEventType;
  title: string;
  occurredAt: DateOnly;
  vetName: string | null;
  clinic: string | null;
  description: string | null;
  /** Próxima fecha prevista: refuerzo de vacuna, siguiente desparasitación… */
  nextDueAt: DateOnly | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

export interface Photo {
  id: string;
  petId: string;
  url: string;
  caption: string | null;
  takenAt: DateOnly | null;
  /** La foto de portada es la que representa a la mascota en el mural. */
  isCover: boolean;
  createdAt: DateTime;
}

export interface Reminder {
  id: string;
  petId: string;
  type: ReminderType;
  title: string;
  dueAt: DateTime;
  recurrence: Recurrence;
  /** Enlace opcional al tratamiento que originó el recordatorio. */
  medicationId: string | null;
  completedAt: DateTime | null;
  notes: string | null;
  createdAt: DateTime;
  updatedAt: DateTime;
}

// --- Vistas compuestas -----------------------------------------------------

/** Mascota con lo mínimo para pintar una tarjeta del mural sin más consultas. */
export interface PetSummary extends Pet {
  coverPhotoUrl: string | null;
  latestWeightKg: number | null;
  activeConditionsCount: number;
  activeMedicationsCount: number;
}

/** Todo lo que necesita la ficha de una mascota. */
export interface PetDossier {
  pet: Pet;
  weights: WeightEntry[];
  conditions: Condition[];
  medications: Medication[];
  doses: MedicationDose[];
  events: ClinicalEvent[];
  photos: Photo[];
  reminders: Reminder[];
}
