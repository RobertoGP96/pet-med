/**
 * Traducción entre las filas de Postgres (snake_case, `numeric` como string en
 * algunos casos) y los tipos del dominio (camelCase).
 *
 * Es la única capa que conoce las dos formas: ni el dominio sabe de columnas
 * ni la UI ve un `pet_id` en su vida.
 */

import type {
  ClinicalEvent,
  Condition,
  Medication,
  MedicationDose,
  Pet,
  Photo,
  Reminder,
  WeightEntry,
} from "@/domain/types";
import type { Tables } from "@/lib/supabase/database.types";

/**
 * Postgres devuelve `numeric` como string a través de PostgREST para no perder
 * precisión. Todas las cantidades pasan por aquí.
 */
function toNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function toNullableNumber(value: number | string | null): number | null {
  return value == null ? null : toNumber(value);
}

export function toPet(row: Tables<"pets">): Pet {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    breedRefId: row.breed_ref_id,
    size: row.size,
    sex: row.sex,
    birthDate: row.birth_date,
    adoptionDate: row.adoption_date,
    color: row.color,
    microchip: row.microchip,
    sterilized: row.sterilized,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toWeightEntry(row: Tables<"weight_entries">): WeightEntry {
  return {
    id: row.id,
    petId: row.pet_id,
    measuredAt: row.measured_at,
    weightKg: toNumber(row.weight_kg),
    bodyConditionScore: toNullableNumber(row.body_condition_score),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function toCondition(row: Tables<"conditions">): Condition {
  return {
    id: row.id,
    petId: row.pet_id,
    name: row.name,
    category: row.category,
    severity: row.severity,
    status: row.status,
    diagnosedAt: row.diagnosed_at,
    resolvedAt: row.resolved_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMedication(row: Tables<"medications">): Medication {
  return {
    id: row.id,
    petId: row.pet_id,
    conditionId: row.condition_id,
    name: row.name,
    dose: toNumber(row.dose),
    doseUnit: row.dose_unit,
    route: row.route,
    intervalHours: row.interval_hours,
    startDate: row.start_date,
    endDate: row.end_date,
    instructions: row.instructions,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMedicationDose(row: Tables<"medication_doses">): MedicationDose {
  return {
    id: row.id,
    medicationId: row.medication_id,
    petId: row.pet_id,
    scheduledAt: row.scheduled_at,
    takenAt: row.taken_at,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export function toClinicalEvent(row: Tables<"clinical_events">): ClinicalEvent {
  return {
    id: row.id,
    petId: row.pet_id,
    type: row.type,
    title: row.title,
    occurredAt: row.occurred_at,
    vetName: row.vet_name,
    clinic: row.clinic,
    description: row.description,
    nextDueAt: row.next_due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPhoto(row: Tables<"photos">): Photo {
  return {
    id: row.id,
    petId: row.pet_id,
    url: row.url,
    caption: row.caption,
    takenAt: row.taken_at,
    isCover: row.is_cover,
    createdAt: row.created_at,
  };
}

export function toReminder(row: Tables<"reminders">): Reminder {
  return {
    id: row.id,
    petId: row.pet_id,
    type: row.type,
    title: row.title,
    dueAt: row.due_at,
    recurrence: row.recurrence,
    medicationId: row.medication_id,
    completedAt: row.completed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
