/**
 * Consultas de lectura.
 *
 * MÓDULO SÓLO DE SERVIDOR. No lleva la directiva `"use server"` a propósito:
 * eso convertiría cada función exportada en un endpoint accesible desde el
 * navegador. Las lecturas se llaman desde Server Components; las escrituras
 * viven en ./actions.ts, que sí es `"use server"`.
 *
 * Criterio de diseño: en vez de pelearse con selects anidados y sus tipos
 * generados, se lanzan varias consultas planas en paralelo y se ensamblan en
 * JavaScript. A la escala de esta app (las mascotas de una casa) sale igual de
 * rápido y el código se lee sin esfuerzo.
 */

import { cache } from "react";

import type { MedicationDose, PetDossier, PetSummary, Reminder } from "@/domain/types";
import { getCurrentOwnerId } from "@/lib/env";
import { formatDose } from "@/lib/format";
import { getDb } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import {
  toClinicalEvent,
  toCondition,
  toMedication,
  toMedicationDose,
  toPet,
  toPhoto,
  toReminder,
  toWeightEntry,
} from "./mappers";

/** Estados de un padecimiento que cuentan como "en curso". */
const OPEN_CONDITION_STATUSES = ["active", "in_treatment"] as const;

/**
 * Convierte la respuesta de Supabase en datos o en una excepción legible.
 * Un fallo de lectura es un error de programación o de infraestructura, no
 * algo que la UI deba maquillar: que suba al error boundary.
 */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) {
    throw new Error(`No se pudo leer ${what}: ${result.error.message}`);
  }
  if (result.data == null) {
    throw new Error(`No se pudo leer ${what}: respuesta vacía.`);
  }
  return result.data;
}

/**
 * Completa las mascotas con los datos que necesita una tarjeta: foto de
 * portada, último peso y cuántos tratamientos y padecimientos tiene abiertos.
 */
async function decorate(pets: Tables<"pets">[]): Promise<PetSummary[]> {
  if (pets.length === 0) return [];

  const db = getDb();
  const ids = pets.map((pet) => pet.id);

  const [photos, weights, conditions, medications] = await Promise.all([
    db.from("photos").select("pet_id, url, is_cover").in("pet_id", ids).eq("is_cover", true),
    db
      .from("weight_entries")
      .select("pet_id, weight_kg, measured_at")
      .in("pet_id", ids)
      .order("measured_at", { ascending: false }),
    db.from("conditions").select("pet_id").in("pet_id", ids).in("status", OPEN_CONDITION_STATUSES),
    db.from("medications").select("pet_id").in("pet_id", ids).eq("is_active", true),
  ]);

  const coverByPet = new Map<string, string>();
  for (const photo of unwrap(photos, "las fotos de portada")) {
    coverByPet.set(photo.pet_id, photo.url);
  }

  // Vienen ordenados de más reciente a más antiguo: el primero de cada
  // mascota es su último peso.
  const latestWeightByPet = new Map<string, number>();
  for (const weight of unwrap(weights, "los pesos")) {
    if (!latestWeightByPet.has(weight.pet_id)) {
      latestWeightByPet.set(weight.pet_id, Number(weight.weight_kg));
    }
  }

  const countBy = (rows: { pet_id: string }[]) => {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.pet_id, (counts.get(row.pet_id) ?? 0) + 1);
    return counts;
  };

  const conditionCounts = countBy(unwrap(conditions, "los padecimientos"));
  const medicationCounts = countBy(unwrap(medications, "los medicamentos"));

  return pets.map((row) => ({
    ...toPet(row),
    coverPhotoUrl: coverByPet.get(row.id) ?? null,
    latestWeightKg: latestWeightByPet.get(row.id) ?? null,
    activeConditionsCount: conditionCounts.get(row.id) ?? 0,
    activeMedicationsCount: medicationCounts.get(row.id) ?? 0,
  }));
}

/** Todas las mascotas del dueño actual. */
export const listPets = cache(async function listPets(): Promise<PetSummary[]> {
  const rows = unwrap(
    await getDb()
      .from("pets")
      .select("*")
      .eq("owner_id", getCurrentOwnerId())
      .order("created_at", { ascending: true }),
    "las mascotas",
  );

  return decorate(rows);
});

/**
 * Mascotas visibles en el mural.
 *
 * El mural es público, así que filtra por `is_public` y no por dueño: en
 * cuanto haya varias cuentas, mostrará las mascotas de todas.
 */
export const listMuralPets = cache(async function listMuralPets(): Promise<PetSummary[]> {
  const rows = unwrap(
    await getDb()
      .from("pets")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false }),
    "el mural",
  );

  return decorate(rows);
});

export const getPet = cache(async function getPet(petId: string) {
  const { data, error } = await getDb().from("pets").select("*").eq("id", petId).maybeSingle();

  if (error) throw new Error(`No se pudo leer la mascota: ${error.message}`);
  return data ? toPet(data) : null;
});

/**
 * Todo el historial de una mascota en una sola tanda de consultas paralelas.
 * Es lo que alimenta la ficha completa y el cálculo de indicadores.
 */
export const getPetDossier = cache(async function getPetDossier(
  petId: string,
): Promise<PetDossier | null> {
  const db = getDb();

  const petResult = await db.from("pets").select("*").eq("id", petId).maybeSingle();
  if (petResult.error) {
    throw new Error(`No se pudo leer la mascota: ${petResult.error.message}`);
  }
  if (!petResult.data) return null;

  const [weights, conditions, medications, doses, events, photos, reminders] = await Promise.all([
    db.from("weight_entries").select("*").eq("pet_id", petId).order("measured_at", { ascending: true }),
    db.from("conditions").select("*").eq("pet_id", petId).order("diagnosed_at", { ascending: false }),
    db.from("medications").select("*").eq("pet_id", petId).order("start_date", { ascending: false }),
    db.from("medication_doses").select("*").eq("pet_id", petId).order("scheduled_at", { ascending: true }),
    db.from("clinical_events").select("*").eq("pet_id", petId).order("occurred_at", { ascending: false }),
    db.from("photos").select("*").eq("pet_id", petId).order("created_at", { ascending: false }),
    db.from("reminders").select("*").eq("pet_id", petId).order("due_at", { ascending: true }),
  ]);

  return {
    pet: toPet(petResult.data),
    weights: unwrap(weights, "los pesos").map(toWeightEntry),
    conditions: unwrap(conditions, "los padecimientos").map(toCondition),
    medications: unwrap(medications, "los medicamentos").map(toMedication),
    doses: unwrap(doses, "las tomas").map(toMedicationDose),
    events: unwrap(events, "la historia clínica").map(toClinicalEvent),
    photos: unwrap(photos, "las fotos").map(toPhoto),
    reminders: unwrap(reminders, "los recordatorios").map(toReminder),
  };
});

export interface ReminderWithPet {
  reminder: Reminder;
  petName: string;
  petAvatarUrl: string | null;
}

/**
 * Recordatorios pendientes de todas las mascotas, del más urgente al menos.
 * Incluye los ya vencidos: son justamente los que hay que ver primero.
 */
export const listPendingReminders = cache(async function listPendingReminders(
  limit = 20,
): Promise<ReminderWithPet[]> {
  const db = getDb();
  const ownerId = getCurrentOwnerId();

  const pets = unwrap(
    await db.from("pets").select("id, name, avatar_url").eq("owner_id", ownerId),
    "las mascotas",
  );

  if (pets.length === 0) return [];

  const petById = new Map(pets.map((pet) => [pet.id, pet]));

  const rows = unwrap(
    await db
      .from("reminders")
      .select("*")
      .in("pet_id", [...petById.keys()])
      .is("completed_at", null)
      .order("due_at", { ascending: true })
      .limit(limit),
    "los recordatorios",
  );

  return rows.map((row) => {
    const pet = petById.get(row.pet_id);
    return {
      reminder: toReminder(row),
      petName: pet?.name ?? "Mascota",
      petAvatarUrl: pet?.avatar_url ?? null,
    };
  });
});

export interface DoseWithContext {
  dose: MedicationDose;
  medicationName: string;
  /** Cantidad ya formateada, p. ej. "2,5 mg". */
  doseLabel: string;
  petName: string;
}

/**
 * Tomas de medicación de hoy (más las vencidas sin registrar), para el panel
 * de "qué toca ahora".
 */
export const listDosesForToday = cache(async function listDosesForToday(
  now: Date,
): Promise<DoseWithContext[]> {
  const db = getDb();
  const ownerId = getCurrentOwnerId();

  const pets = unwrap(await db.from("pets").select("id, name").eq("owner_id", ownerId), "las mascotas");
  if (pets.length === 0) return [];

  const petById = new Map(pets.map((pet) => [pet.id, pet.name]));

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const rows = unwrap(
    await db
      .from("medication_doses")
      .select("*")
      .in("pet_id", [...petById.keys()])
      .eq("status", "pending")
      .lte("scheduled_at", endOfDay.toISOString())
      .order("scheduled_at", { ascending: true }),
    "las tomas de hoy",
  );

  if (rows.length === 0) return [];

  const medicationIds = [...new Set(rows.map((row) => row.medication_id))];
  const medications = unwrap(
    await db.from("medications").select("id, name, dose, dose_unit").in("id", medicationIds),
    "los medicamentos",
  );

  const medicationById = new Map(medications.map((medication) => [medication.id, medication]));

  return rows.map((row) => {
    const medication = medicationById.get(row.medication_id);
    return {
      dose: toMedicationDose(row),
      medicationName: medication?.name ?? "Medicamento",
      doseLabel: medication ? formatDose(Number(medication.dose), medication.dose_unit) : "",
      petName: petById.get(row.pet_id) ?? "Mascota",
    };
  });
});
