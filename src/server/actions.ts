"use server";

/**
 * Server Actions: todas las escrituras de la app.
 *
 * Contrato común, pensado para `useActionState`:
 *   (prevState: ActionState, formData: FormData) => Promise<ActionState>
 *
 * Toda acción hace lo mismo en el mismo orden:
 *   1. valida el FormData con su esquema de zod,
 *   2. escribe en la base de datos,
 *   3. invalida las rutas afectadas,
 *   4. devuelve un ActionState que el formulario sabe pintar.
 *
 * Nota de seguridad: las Server Actions se publican como endpoints POST. Al no
 * haber sesión todavía, la autorización se apoya en `getCurrentOwnerId()`. En
 * cuanto exista login, cada acción debe verificar que la mascota pertenece a
 * quien la está pidiendo — está marcado con `TODO(auth)`.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clinicalEventInputSchema,
  conditionInputSchema,
  doseUpdateSchema,
  medicationInputSchema,
  parseFormData,
  petInputSchema,
  photoUploadSchema,
  reminderInputSchema,
  weightInputSchema,
} from "@/domain/schemas";
import { generateDoseSchedule } from "@/domain/health/medication";
import { RECURRENCE_DAYS } from "@/domain/enums";
import {
  describeDatabaseError,
  errorState,
  successState,
  type ActionState,
} from "@/lib/action-result";
import { getCurrentOwnerId } from "@/lib/env";
import { getStorage } from "@/lib/storage";
import { getDb } from "@/lib/supabase/admin";

/** Días de tomas que se planifican por adelantado al guardar un tratamiento. */
const DOSE_HORIZON_DAYS = 30;

/** Refresca el mural, el listado y la ficha de una mascota. */
function revalidatePet(petId: string): void {
  revalidatePath("/");
  revalidatePath("/mascotas");
  revalidatePath(`/mascotas/${petId}`);
  revalidatePath("/recordatorios");
}

// ===========================================================================
// Mascotas
// ===========================================================================

export async function createPetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseFormData(petInputSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const input = parsed.data;

  const { data, error } = await getDb()
    .from("pets")
    .insert({
      owner_id: getCurrentOwnerId(),
      name: input.name,
      species: input.species,
      breed: input.breed,
      breed_ref_id: input.breedRefId,
      size: input.size,
      sex: input.sex,
      birth_date: input.birthDate,
      adoption_date: input.adoptionDate,
      color: input.color,
      microchip: input.microchip,
      sterilized: input.sterilized,
      bio: input.bio,
      avatar_url: input.avatarUrl,
      is_public: input.isPublic,
    })
    .select("id")
    .single();

  if (error) return errorState(describeDatabaseError(error));

  revalidatePath("/");
  revalidatePath("/mascotas");
  // `redirect` lanza una excepción de control de flujo: nada se ejecuta
  // después, por eso la revalidación va antes.
  redirect(`/mascotas/${data.id}`);
}

export async function updatePetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const petId = String(formData.get("petId") ?? "");
  if (!petId) return errorState("Falta la mascota que hay que actualizar.");

  const parsed = parseFormData(petInputSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const input = parsed.data;

  // TODO(auth): comprobar que la mascota pertenece al usuario de la sesión.
  const { error } = await getDb()
    .from("pets")
    .update({
      name: input.name,
      species: input.species,
      breed: input.breed,
      breed_ref_id: input.breedRefId,
      size: input.size,
      sex: input.sex,
      birth_date: input.birthDate,
      adoption_date: input.adoptionDate,
      color: input.color,
      microchip: input.microchip,
      sterilized: input.sterilized,
      bio: input.bio,
      avatar_url: input.avatarUrl,
      is_public: input.isPublic,
    })
    .eq("id", petId);

  if (error) return errorState(describeDatabaseError(error));

  revalidatePet(petId);
  return successState("Ficha actualizada.");
}

export async function deletePetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const petId = String(formData.get("petId") ?? "");
  if (!petId) return errorState("Falta la mascota que hay que borrar.");

  // Las tablas hijas tienen `on delete cascade`: se van con ella.
  const { error } = await getDb().from("pets").delete().eq("id", petId);
  if (error) return errorState(describeDatabaseError(error));

  revalidatePath("/");
  revalidatePath("/mascotas");
  redirect("/mascotas");
}

// ===========================================================================
// Peso
// ===========================================================================

export async function addWeightAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseFormData(weightInputSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const input = parsed.data;

  const { error } = await getDb().from("weight_entries").insert({
    pet_id: input.petId,
    measured_at: input.measuredAt,
    weight_kg: input.weightKg,
    body_condition_score: input.bodyConditionScore,
    notes: input.notes,
  });

  if (error) return errorState(describeDatabaseError(error));

  revalidatePet(input.petId);
  return successState("Peso registrado.");
}

export async function deleteWeightAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el registro que hay que borrar.");

  const { error } = await getDb().from("weight_entries").delete().eq("id", id);
  if (error) return errorState(describeDatabaseError(error));

  revalidatePet(petId);
  return successState("Registro de peso eliminado.");
}

// ===========================================================================
// Padecimientos
// ===========================================================================

export async function saveConditionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseFormData(conditionInputSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const input = parsed.data;
  const id = String(formData.get("id") ?? "");

  const values = {
    pet_id: input.petId,
    name: input.name,
    category: input.category,
    severity: input.severity,
    status: input.status,
    diagnosed_at: input.diagnosedAt,
    resolved_at: input.resolvedAt,
    notes: input.notes,
  };

  const db = getDb();
  const { error } = id
    ? await db.from("conditions").update(values).eq("id", id)
    : await db.from("conditions").insert(values);

  if (error) return errorState(describeDatabaseError(error));

  revalidatePet(input.petId);
  return successState(id ? "Padecimiento actualizado." : "Padecimiento registrado.");
}

export async function deleteConditionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el padecimiento que hay que borrar.");

  const { error } = await getDb().from("conditions").delete().eq("id", id);
  if (error) return errorState(describeDatabaseError(error));

  revalidatePet(petId);
  return successState("Padecimiento eliminado.");
}

// ===========================================================================
// Medicamentos y tomas
// ===========================================================================

/**
 * Planifica las tomas de un tratamiento para los próximos días.
 *
 * Se apoya en el UNIQUE (medication_id, scheduled_at) de la tabla: con
 * `ignoreDuplicates` volver a llamar a esta función nunca duplica tomas ni
 * pisa las que ya se marcaron como administradas.
 */
async function scheduleDoses(
  medicationId: string,
  petId: string,
  medication: { startDate: string; endDate: string | null; intervalHours: number },
  now: Date,
): Promise<void> {
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + DOSE_HORIZON_DAYS);

  const schedule = generateDoseSchedule(medication, now, horizon);
  if (schedule.length === 0) return;

  await getDb()
    .from("medication_doses")
    .upsert(
      schedule.map((scheduledAt) => ({
        medication_id: medicationId,
        pet_id: petId,
        scheduled_at: scheduledAt,
        status: "pending" as const,
      })),
      { onConflict: "medication_id,scheduled_at", ignoreDuplicates: true },
    );
}

export async function saveMedicationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseFormData(medicationInputSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const input = parsed.data;
  const id = String(formData.get("id") ?? "");

  const values = {
    pet_id: input.petId,
    condition_id: input.conditionId,
    name: input.name,
    dose: input.dose,
    dose_unit: input.doseUnit,
    route: input.route,
    interval_hours: input.intervalHours,
    start_date: input.startDate,
    end_date: input.endDate,
    instructions: input.instructions,
    is_active: input.isActive,
  };

  const db = getDb();
  const { data, error } = id
    ? await db.from("medications").update(values).eq("id", id).select("id").single()
    : await db.from("medications").insert(values).select("id").single();

  if (error) return errorState(describeDatabaseError(error));

  if (input.isActive) {
    await scheduleDoses(
      data.id,
      input.petId,
      { startDate: input.startDate, endDate: input.endDate, intervalHours: input.intervalHours },
      new Date(),
    );
  }

  revalidatePet(input.petId);
  return successState(id ? "Tratamiento actualizado." : "Tratamiento registrado.");
}

export async function deleteMedicationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el tratamiento que hay que borrar.");

  const { error } = await getDb().from("medications").delete().eq("id", id);
  if (error) return errorState(describeDatabaseError(error));

  revalidatePet(petId);
  return successState("Tratamiento eliminado.");
}

/** Marca una toma como administrada, omitida o de nuevo pendiente. */
export async function updateDoseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseFormData(doseUpdateSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "No se pudo actualizar la toma.", parsed.fieldErrors);
  }

  const petId = String(formData.get("petId") ?? "");
  const input = parsed.data;

  const { error } = await getDb()
    .from("medication_doses")
    .update({
      status: input.status,
      // La hora de administración sólo tiene sentido si se administró.
      taken_at: input.status === "taken" ? new Date().toISOString() : null,
      notes: input.notes,
    })
    .eq("id", input.doseId);

  if (error) return errorState(describeDatabaseError(error));

  if (petId) revalidatePet(petId);
  return successState(input.status === "taken" ? "Toma registrada." : "Toma actualizada.");
}

// ===========================================================================
// Historia clínica
// ===========================================================================

export async function saveClinicalEventAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseFormData(clinicalEventInputSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const input = parsed.data;
  const id = String(formData.get("id") ?? "");

  const values = {
    pet_id: input.petId,
    type: input.type,
    title: input.title,
    occurred_at: input.occurredAt,
    vet_name: input.vetName,
    clinic: input.clinic,
    description: input.description,
    next_due_at: input.nextDueAt,
  };

  const db = getDb();
  const { error } = id
    ? await db.from("clinical_events").update(values).eq("id", id)
    : await db.from("clinical_events").insert(values);

  if (error) return errorState(describeDatabaseError(error));

  revalidatePet(input.petId);
  return successState(id ? "Evento actualizado." : "Evento añadido a la historia clínica.");
}

export async function deleteClinicalEventAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el evento que hay que borrar.");

  const { error } = await getDb().from("clinical_events").delete().eq("id", id);
  if (error) return errorState(describeDatabaseError(error));

  revalidatePet(petId);
  return successState("Evento eliminado.");
}

// ===========================================================================
// Fotos
// ===========================================================================

export async function uploadPhotoAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseFormData(photoUploadSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa la imagen seleccionada.", parsed.fieldErrors);
  }

  const input = parsed.data;

  let stored;
  try {
    stored = await getStorage().upload(input.file, input.petId);
  } catch (error) {
    return errorState(
      error instanceof Error ? error.message : "No se pudo subir la imagen.",
    );
  }

  const db = getDb();

  // Sólo puede haber una portada por mascota (índice único parcial): se baja
  // la anterior antes de insertar la nueva.
  if (input.isCover) {
    await db.from("photos").update({ is_cover: false }).eq("pet_id", input.petId).eq("is_cover", true);
  }

  const { error } = await db.from("photos").insert({
    pet_id: input.petId,
    url: stored.url,
    caption: input.caption,
    taken_at: input.takenAt,
    is_cover: input.isCover,
  });

  if (error) {
    // La fila no se guardó: no dejamos el archivo huérfano en el disco/bucket.
    await getStorage().remove(stored.key);
    return errorState(describeDatabaseError(error));
  }

  revalidatePet(input.petId);
  return successState("Foto añadida.");
}

export async function setCoverPhotoAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta la foto.");

  const db = getDb();
  await db.from("photos").update({ is_cover: false }).eq("pet_id", petId).eq("is_cover", true);

  const { error } = await db.from("photos").update({ is_cover: true }).eq("id", id);
  if (error) return errorState(describeDatabaseError(error));

  revalidatePet(petId);
  return successState("Portada actualizada.");
}

export async function deletePhotoAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta la foto que hay que borrar.");

  const db = getDb();
  const { data: photo } = await db.from("photos").select("url").eq("id", id).maybeSingle();

  const { error } = await db.from("photos").delete().eq("id", id);
  if (error) return errorState(describeDatabaseError(error));

  // El archivo se borra después de la fila: si esto falla, sobra un archivo,
  // que es mucho menos grave que una foto rota en la galería.
  if (photo?.url) {
    await getStorage().remove(photo.url.replace(/^\/uploads\//, ""));
  }

  revalidatePet(petId);
  return successState("Foto eliminada.");
}

// ===========================================================================
// Recordatorios
// ===========================================================================

export async function saveReminderAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseFormData(reminderInputSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const input = parsed.data;
  const id = String(formData.get("id") ?? "");

  const values = {
    pet_id: input.petId,
    type: input.type,
    title: input.title,
    due_at: input.dueAt,
    recurrence: input.recurrence,
    medication_id: input.medicationId,
    notes: input.notes,
  };

  const db = getDb();
  const { error } = id
    ? await db.from("reminders").update(values).eq("id", id)
    : await db.from("reminders").insert(values);

  if (error) return errorState(describeDatabaseError(error));

  revalidatePet(input.petId);
  return successState(id ? "Recordatorio actualizado." : "Recordatorio creado.");
}

/**
 * Marca un recordatorio como hecho. Si se repite, además crea el siguiente
 * para que la cadena no se rompa.
 */
export async function completeReminderAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el recordatorio.");

  const db = getDb();
  const { data: reminder, error: readError } = await db
    .from("reminders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (readError) return errorState(describeDatabaseError(readError));
  if (!reminder) return errorState("Ese recordatorio ya no existe.");

  const { error } = await db
    .from("reminders")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return errorState(describeDatabaseError(error));

  const days = RECURRENCE_DAYS[reminder.recurrence];
  if (days != null) {
    const next = new Date(reminder.due_at);
    next.setDate(next.getDate() + days);

    await db.from("reminders").insert({
      pet_id: reminder.pet_id,
      type: reminder.type,
      title: reminder.title,
      due_at: next.toISOString(),
      recurrence: reminder.recurrence,
      medication_id: reminder.medication_id,
      notes: reminder.notes,
    });
  }

  revalidatePet(petId);
  return successState(days != null ? "Hecho. Ya está creado el siguiente." : "Recordatorio completado.");
}

export async function deleteReminderAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el recordatorio que hay que borrar.");

  const { error } = await getDb().from("reminders").delete().eq("id", id);
  if (error) return errorState(describeDatabaseError(error));

  revalidatePet(petId);
  return successState("Recordatorio eliminado.");
}
