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
 *
 * SEGURIDAD. Todas estas funciones entran con el cliente de sesión
 * (`lib/supabase/server.ts`), no con la clave de servicio. Eso significa que la
 * RLS del esquema se aplica de verdad: pedir la mascota de otra persona no
 * devuelve un error, devuelve cero filas. Los filtros por dueño que se ven aquí
 * abajo son por claridad y para acotar el índice, no la barrera de seguridad —
 * la barrera está en la base de datos, que es donde no se puede olvidar.
 */

import { cache } from "react";

import type { Species } from "@/domain/enums";
import type {
  ClinicalEvent,
  DateTime,
  Medication,
  MedicationDose,
  MuralPet,
  Pet,
  PetSummary,
  Photo,
  Reminder,
  WeightEntry,
} from "@/domain/types";
import { requireAdmin, requireUser, type UserRole } from "@/lib/auth";
import { formatDose } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Db } from "@/lib/supabase/admin";
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
 *
 * Sólo vale para mascotas propias. Sobre mascotas ajenas la RLS deja las
 * consultas de peso, padecimientos y medicación en cero filas, que es
 * justamente lo que debe pasar; para el mural existe `listMuralPets`.
 */
async function decorate(db: Db, pets: Tables<"pets">[]): Promise<PetSummary[]> {
  if (pets.length === 0) return [];

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

// ---------------------------------------------------------------------------
// Vistas transversales: lo mismo, pero de todas tus mascotas a la vez
// ---------------------------------------------------------------------------
//
// Las páginas /vacunas, /peso y /fotos responden a preguntas que la ficha de
// una mascota no puede contestar: «¿a quién le toca el refuerzo?», «¿cómo van
// de peso?», «enséñame las fotos». Las tres siguen el mismo patrón: una
// consulta para las mascotas y otra para la tabla hija, agrupada en memoria.
//
// Ninguna calcula estados de salud: eso son funciones de dominio y necesitan
// que se les pase `now` desde la página (AGENTS.md, regla 3). Aquí sólo se lee.

/** Lo mínimo para identificar una mascota en una lista. */
export interface PetRef {
  id: string;
  name: string;
  species: Species;
  avatarUrl: string | null;
}

/** Un grupo por mascota, con lo que se haya pedido de la tabla hija. */
export interface PetGroup<T> {
  pet: PetRef;
  items: T[];
}

/**
 * Las mascotas propias, en el orden en que se dieron de alta.
 *
 * Es la primera mitad de las tres consultas de abajo. Va aparte para que las
 * tres coincidan en el orden: si cada una ordenara por su cuenta, las mascotas
 * saldrían en distinta posición en cada página sin motivo aparente.
 */
const listOwnedPetRefs = cache(async function listOwnedPetRefs(): Promise<PetRef[]> {
  const user = await requireUser();
  const db = await createClient();

  const rows = unwrap(
    await db
      .from("pets")
      .select("id, name, species, avatar_url")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true }),
    "las mascotas",
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    species: row.species,
    avatarUrl: row.avatar_url,
  }));
});

/**
 * Agrupa las filas de una tabla hija bajo su mascota.
 *
 * Devuelve TODAS las mascotas, también las que no tengan ninguna fila: una
 * mascota sin pesar es justo la que hay que ver en la página de peso, y si se
 * filtrara aquí desaparecería sin explicación.
 */
function groupByPet<T extends { petId: string }>(pets: PetRef[], items: T[]): PetGroup<T>[] {
  const byPet = new Map<string, T[]>(pets.map((pet) => [pet.id, []]));
  for (const item of items) byPet.get(item.petId)?.push(item);
  return pets.map((pet) => ({ pet, items: byPet.get(pet.id) ?? [] }));
}

/**
 * Historia preventiva de todas tus mascotas: vacunas y desparasitaciones.
 *
 * Trae los dos tipos juntos porque `getPreventionStatus` necesita ver la serie
 * completa de un tipo para dar con la próxima fecha, que puede estar anotada en
 * un evento anterior y no en el último.
 */
export const listPreventionByPet = cache(async function listPreventionByPet(): Promise<
  PetGroup<ClinicalEvent>[]
> {
  const pets = await listOwnedPetRefs();
  if (pets.length === 0) return [];

  const db = await createClient();

  const rows = unwrap(
    await db
      .from("clinical_events")
      .select("*")
      .in(
        "pet_id",
        pets.map((pet) => pet.id),
      )
      .in("type", ["vaccine", "deworming"])
      .order("occurred_at", { ascending: false }),
    "las vacunas",
  );

  return groupByPet(pets, rows.map(toClinicalEvent));
});

/** Todos los pesajes de todas tus mascotas, del más antiguo al más reciente. */
export const listWeightsByPet = cache(async function listWeightsByPet(): Promise<
  PetGroup<WeightEntry>[]
> {
  const pets = await listOwnedPetRefs();
  if (pets.length === 0) return [];

  const db = await createClient();

  const rows = unwrap(
    await db
      .from("weight_entries")
      .select("*")
      .in(
        "pet_id",
        pets.map((pet) => pet.id),
      )
      // Ascendente porque es el orden que espera la gráfica y el que necesita
      // `getWeightTrend` para comparar contra el peso de hace 90 días.
      .order("measured_at", { ascending: true }),
    "los pesos",
  );

  return groupByPet(pets, rows.map(toWeightEntry));
});

/** Todas las fotos de todas tus mascotas, la portada primero. */
export const listPhotosByPet = cache(async function listPhotosByPet(): Promise<PetGroup<Photo>[]> {
  const pets = await listOwnedPetRefs();
  if (pets.length === 0) return [];

  const db = await createClient();

  const rows = unwrap(
    await db
      .from("photos")
      .select("*")
      .in(
        "pet_id",
        pets.map((pet) => pet.id),
      )
      .order("is_cover", { ascending: false })
      .order("created_at", { ascending: false }),
    "las fotos",
  );

  return groupByPet(pets, rows.map(toPhoto));
});

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------
//
// Estas dos consultas no llevan ningún filtro por dueño, y no es un descuido:
// dependen de que `requireAdmin()` haya pasado y de que las políticas
// `pets_owner_select` y `profiles_self_select` incluyan `public.is_admin()`.
// Para quien no sea administrador devuelven exactamente sus propias filas, que
// es el modo seguro de fallar.
//
// Lo que un administrador NO puede leer es el historial clínico ajeno: las
// políticas de weight_entries, conditions, medications, medication_doses,
// clinical_events y reminders siguen siendo sólo del dueño. Moderar el mural no
// es motivo para abrir el expediente médico de nadie.

export interface AdminPet {
  id: string;
  name: string;
  species: Species;
  breed: string | null;
  avatarUrl: string | null;
  coverPhotoUrl: string | null;
  /** Lo que decidió el dueño. */
  isPublic: boolean;
  /** Lo que decidió la moderación. */
  hiddenByAdmin: boolean;
  featured: boolean;
  featuredAt: DateTime | null;
  createdAt: DateTime;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
}

export interface AdminProfile {
  id: string;
  displayName: string | null;
  email: string | null;
  role: UserRole;
  createdAt: DateTime;
  petsCount: number;
}

/** Todas las mascotas del sistema, en el orden en que salen en el mural. */
export const listPetsForAdmin = cache(async function listPetsForAdmin(): Promise<AdminPet[]> {
  await requireAdmin();
  const db = await createClient();

  const pets = unwrap(
    await db
      .from("pets")
      .select(
        "id, name, species, breed, avatar_url, is_public, hidden_by_admin, featured, featured_at, created_at, owner_id",
      )
      .order("featured", { ascending: false })
      .order("featured_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    "las mascotas",
  );

  if (pets.length === 0) return [];

  // No hay `join` de PostgREST entre pets y profiles: la clave foránea de
  // `owner_id` apunta a auth.users, no a profiles. Se resuelve con dos
  // consultas y un Map, como el resto del módulo.
  const [profiles, covers] = await Promise.all([
    db
      .from("profiles")
      .select("id, display_name, email")
      .in("id", [...new Set(pets.map((pet) => pet.owner_id))]),
    db
      .from("photos")
      .select("pet_id, url")
      .in(
        "pet_id",
        pets.map((pet) => pet.id),
      )
      .eq("is_cover", true),
  ]);

  const ownerById = new Map(
    unwrap(profiles, "los perfiles").map((profile) => [profile.id, profile]),
  );
  const coverByPet = new Map(
    unwrap(covers, "las fotos de portada").map((photo) => [photo.pet_id, photo.url]),
  );

  return pets.map((pet) => ({
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    avatarUrl: pet.avatar_url,
    coverPhotoUrl: coverByPet.get(pet.id) ?? null,
    isPublic: pet.is_public,
    hiddenByAdmin: pet.hidden_by_admin,
    featured: pet.featured,
    featuredAt: pet.featured_at,
    createdAt: pet.created_at,
    ownerId: pet.owner_id,
    // Las mascotas del seed apuntan a un dueño que no existe en auth.users, así
    // que aquí no habrá perfil. Se deja en null y la interfaz lo dice.
    ownerName: ownerById.get(pet.owner_id)?.display_name ?? null,
    ownerEmail: ownerById.get(pet.owner_id)?.email ?? null,
  }));
});

/** Todas las cuentas, con cuántas mascotas tiene cada una. */
export const listProfilesForAdmin = cache(async function listProfilesForAdmin(): Promise<
  AdminProfile[]
> {
  await requireAdmin();
  const db = await createClient();

  const [profiles, pets] = await Promise.all([
    db.from("profiles").select("*").order("created_at", { ascending: true }),
    db.from("pets").select("owner_id"),
  ]);

  const counts = new Map<string, number>();
  for (const pet of unwrap(pets, "las mascotas")) {
    counts.set(pet.owner_id, (counts.get(pet.owner_id) ?? 0) + 1);
  }

  return unwrap(profiles, "los perfiles").map((profile) => ({
    id: profile.id,
    displayName: profile.display_name,
    email: profile.email,
    role: profile.role,
    createdAt: profile.created_at,
    petsCount: counts.get(profile.id) ?? 0,
  }));
});

/** Todas las mascotas de quien ha iniciado sesión. */
export const listPets = cache(async function listPets(): Promise<PetSummary[]> {
  const user = await requireUser();
  const db = await createClient();

  const rows = unwrap(
    await db
      .from("pets")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true }),
    "las mascotas",
  );

  return decorate(db, rows);
});

/**
 * Mascotas visibles en el mural, de todas las cuentas.
 *
 * Devuelve `MuralPet` y no `PetSummary`: aquí no viaja nada del historial
 * médico. Ver la nota del tipo en src/domain/types.ts.
 *
 * El orden lo marca la moderación: primero las destacadas por un
 * administrador, de la más reciente a la más antigua, y detrás el resto por
 * fecha de alta. Es el mismo orden del índice `pets_mural_idx`.
 */
export const listMuralPets = cache(async function listMuralPets(): Promise<MuralPet[]> {
  const db = await createClient();

  // Sin `.eq("is_public", true)`: la política `pets_public_select` ya limita la
  // lectura a las mascotas públicas y no ocultadas, tanto para visitantes como
  // para quien haya iniciado sesión. Repetir el filtro aquí sería duplicar la
  // regla en dos sitios que pueden desincronizarse.
  const rows = unwrap(
    await db
      .from("pets")
      .select("id, name, species, breed, birth_date, bio, avatar_url, featured, featured_at, created_at")
      .order("featured", { ascending: false })
      .order("featured_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    "el mural",
  );

  if (rows.length === 0) return [];

  const covers = unwrap(
    await db
      .from("photos")
      .select("pet_id, url")
      .in(
        "pet_id",
        rows.map((row) => row.id),
      )
      .eq("is_cover", true),
    "las fotos del mural",
  );

  const coverByPet = new Map(covers.map((photo) => [photo.pet_id, photo.url]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    birthDate: row.birth_date,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    coverPhotoUrl: coverByPet.get(row.id) ?? null,
    featured: row.featured,
  }));
});

/**
 * Una mascota del mural, con sus fotos públicas.
 *
 * Es lo que alimenta /mural/[petId], la ficha que ve cualquiera. La ficha
 * completa —peso, padecimientos, medicación, historia clínica— vive en
 * /mascotas/[petId] y sólo la abre su dueño.
 */
export const getMuralPet = cache(async function getMuralPet(petId: string) {
  const db = await createClient();

  const { data, error } = await db
    .from("pets")
    .select("id, name, species, breed, size, sex, birth_date, color, bio, avatar_url, featured")
    .eq("id", petId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer la mascota: ${error.message}`);
  if (!data) return null;

  const photos = unwrap(
    await db
      .from("photos")
      .select("*")
      .eq("pet_id", petId)
      .order("is_cover", { ascending: false })
      .order("created_at", { ascending: false }),
    "las fotos",
  );

  return { pet: data, photos: photos.map(toPhoto) };
});

/**
 * Una mascota propia. Devuelve null si no existe **o si no es tuya**: para la
 * RLS las dos situaciones son la misma, y así la UI no distingue entre «no
 * existe» y «no es tuya», que es lo correcto.
 */
export const getPet = cache(async function getPet(petId: string) {
  const db = await createClient();
  const { data, error } = await db.from("pets").select("*").eq("id", petId).maybeSingle();

  if (error) throw new Error(`No se pudo leer la mascota: ${error.message}`);
  return data ? toPet(data) : null;
});

// ---------------------------------------------------------------------------
// Lecturas por pestaña de la ficha
// ---------------------------------------------------------------------------
//
// Cada pestaña de /mascotas/[petId] pide SÓLO su tabla. Antes todas llamaban a
// un único `getPetDossier` que leía las siete tablas hijas, así que abrir
// «Fotos» pagaba también los pesos, los padecimientos, la medicación, la
// historia clínica y los recordatorios. Con las rutas dinámicas de Next 16 eso
// se nota en cada clic: no hay caché de cliente que lo tape (ver los
// `loading.tsx` de cada pestaña).
//
// La existencia de la mascota la comprueba `getPet`, que ya resolvió el layout
// de la ficha. Al ir envuelto en `cache()` de React, volver a llamarlo desde la
// página no cuesta una consulta más: devuelve el mismo resultado de la petición
// en curso. Por eso cada pestaña puede seguir haciendo su propio `notFound()`
// sin pagar nada por ello.

/** Lo que comparten todas las pestañas: la mascota, o null si no es tuya. */
async function readPetTab<T>(
  petId: string,
  read: (db: Db) => Promise<T>,
): Promise<{ pet: Pet; data: T } | null> {
  const [pet, db] = await Promise.all([getPet(petId), createClient()]);
  if (!pet) return null;

  return { pet, data: await read(db) };
}

/** Pestaña «Peso»: sólo los pesajes, del más antiguo al más reciente. */
export const getPetWeights = cache(async function getPetWeights(petId: string) {
  return readPetTab(petId, async (db) =>
    unwrap(
      await db
        .from("weight_entries")
        .select("*")
        .eq("pet_id", petId)
        .order("measured_at", { ascending: true }),
      "los pesos",
    ).map(toWeightEntry),
  );
});

/** Pestaña «Padecimientos». */
export const getPetConditions = cache(async function getPetConditions(petId: string) {
  return readPetTab(petId, async (db) =>
    unwrap(
      await db
        .from("conditions")
        .select("*")
        .eq("pet_id", petId)
        .order("diagnosed_at", { ascending: false }),
      "los padecimientos",
    ).map(toCondition),
  );
});

/** Pestaña «Historia clínica». */
export const getPetEvents = cache(async function getPetEvents(petId: string) {
  return readPetTab(petId, async (db) =>
    unwrap(
      await db
        .from("clinical_events")
        .select("*")
        .eq("pet_id", petId)
        .order("occurred_at", { ascending: false }),
      "la historia clínica",
    ).map(toClinicalEvent),
  );
});

/** Pestaña «Fotos». */
export const getPetPhotos = cache(async function getPetPhotos(petId: string) {
  return readPetTab(petId, async (db) =>
    unwrap(
      await db.from("photos").select("*").eq("pet_id", petId).order("created_at", { ascending: false }),
      "las fotos",
    ).map(toPhoto),
  );
});

/**
 * Pestaña «Medicamentos»: los tratamientos, sus tomas y los padecimientos.
 *
 * Los padecimientos entran porque el formulario deja enlazar un tratamiento
 * con el padecimiento que lo motiva, y la lista los muestra en cada ficha.
 */
export const getPetMedications = cache(async function getPetMedications(petId: string) {
  return readPetTab(petId, async (db) => {
    const [medications, doses, conditions] = await Promise.all([
      db.from("medications").select("*").eq("pet_id", petId).order("start_date", { ascending: false }),
      db
        .from("medication_doses")
        .select("*")
        .eq("pet_id", petId)
        .order("scheduled_at", { ascending: true }),
      db.from("conditions").select("*").eq("pet_id", petId).order("diagnosed_at", { ascending: false }),
    ]);

    return {
      medications: unwrap(medications, "los medicamentos").map(toMedication),
      doses: unwrap(doses, "las tomas").map(toMedicationDose),
      conditions: unwrap(conditions, "los padecimientos").map(toCondition),
    };
  });
});

/**
 * Pestaña «Resumen»: lo que necesitan los indicadores de salud.
 *
 * `buildHealthIndicators` mira peso, padecimientos, medicación, tomas y
 * eventos clínicos. Ni fotos ni recordatorios entran en ningún indicador, así
 * que aquí no se leen.
 */
export const getPetOverview = cache(async function getPetOverview(petId: string) {
  return readPetTab(petId, async (db) => {
    const [weights, conditions, medications, doses, events] = await Promise.all([
      db
        .from("weight_entries")
        .select("*")
        .eq("pet_id", petId)
        .order("measured_at", { ascending: true }),
      db.from("conditions").select("*").eq("pet_id", petId).order("diagnosed_at", { ascending: false }),
      db.from("medications").select("*").eq("pet_id", petId).order("start_date", { ascending: false }),
      db
        .from("medication_doses")
        .select("*")
        .eq("pet_id", petId)
        .order("scheduled_at", { ascending: true }),
      db
        .from("clinical_events")
        .select("*")
        .eq("pet_id", petId)
        .order("occurred_at", { ascending: false }),
    ]);

    return {
      weights: unwrap(weights, "los pesos").map(toWeightEntry),
      conditions: unwrap(conditions, "los padecimientos").map(toCondition),
      medications: unwrap(medications, "los medicamentos").map(toMedication),
      doses: unwrap(doses, "las tomas").map(toMedicationDose),
      events: unwrap(events, "la historia clínica").map(toClinicalEvent),
    };
  });
});

/**
 * Los tratamientos de todas tus mascotas, agrupados por mascota.
 *
 * Es para el desplegable de /recordatorios, que ofrece los tratamientos de
 * cada mascota para poder enlazar el recordatorio con su medicamento. Antes esa
 * página llamaba a `getPetDossier` DENTRO de un bucle sobre las mascotas: con
 * cinco fichas eran cuarenta consultas para llenar un desplegable. Ahora es
 * una.
 */
export const listMedicationsByPet = cache(async function listMedicationsByPet(
  petIds: string[],
): Promise<Map<string, Medication[]>> {
  const byPet = new Map<string, Medication[]>(petIds.map((id) => [id, []]));
  if (petIds.length === 0) return byPet;

  const db = await createClient();

  const rows = unwrap(
    await db
      .from("medications")
      .select("*")
      .in("pet_id", petIds)
      .order("start_date", { ascending: false }),
    "los medicamentos",
  );

  for (const row of rows) byPet.get(row.pet_id)?.push(toMedication(row));
  return byPet;
});

export interface ReminderWithPet {
  reminder: Reminder;
  petName: string;
  petAvatarUrl: string | null;
}

/**
 * Recordatorios pendientes de todas tus mascotas, del más urgente al menos.
 * Incluye los ya vencidos: son justamente los que hay que ver primero.
 */
export const listPendingReminders = cache(async function listPendingReminders(
  limit = 20,
): Promise<ReminderWithPet[]> {
  const user = await requireUser();
  const db = await createClient();

  const pets = unwrap(
    await db.from("pets").select("id, name, avatar_url").eq("owner_id", user.id),
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
  const user = await requireUser();
  const db = await createClient();

  const pets = unwrap(await db.from("pets").select("id, name").eq("owner_id", user.id), "las mascotas");
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
