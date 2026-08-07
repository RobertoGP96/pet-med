"use server";

/**
 * Server Actions: todas las escrituras de la app.
 *
 * Contrato común, pensado para `useActionState`:
 *   (prevState: ActionState, formData: FormData) => Promise<ActionState>
 *
 * Toda acción hace lo mismo en el mismo orden:
 *   1. exige sesión,
 *   2. valida el FormData con su esquema de zod,
 *   3. escribe en la base de datos con el cliente de la sesión,
 *   4. invalida las rutas afectadas,
 *   5. devuelve un ActionState que el formulario sabe pintar.
 *
 * SEGURIDAD. Las Server Actions se publican como endpoints POST: cualquiera
 * puede llamarlas con el `petId` que quiera. Quien decide si esa fila es suya
 * es la RLS del esquema, porque estas acciones entran con el cliente de sesión
 * y no con la clave de servicio.
 *
 * Eso deja un detalle que hay que tratar a mano y que es la razón de
 * `denyIfUntouched()`: un UPDATE o un DELETE que la RLS no permite no falla,
 * simplemente afecta a cero filas. Sin comprobarlo, la app respondería «Ficha
 * actualizada» sin haber actualizado nada. Por eso todas las escrituras sobre
 * filas existentes llevan `.select("id")` y se comprueba qué volvió.
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
  signInSchema,
  signUpSchema,
  weightInputSchema,
} from "@/domain/schemas";
import { generateDoseSchedule } from "@/domain/health/medication";
import { createsCycle, type ParentLinks } from "@/domain/family";
import { RECURRENCE_DAYS, type Species } from "@/domain/enums";
import {
  describeDatabaseError,
  errorState,
  successState,
  type ActionState,
} from "@/lib/action-result";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getStorage } from "@/lib/storage";
import type { Db } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Días de tomas que se planifican por adelantado al guardar un tratamiento. */
const DOSE_HORIZON_DAYS = 30;

/** Refresca el mural, el listado y la ficha de una mascota. */
function revalidatePet(petId: string): void {
  revalidatePath("/");
  revalidatePath("/mascotas");
  revalidatePath(`/mascotas/${petId}`);
  revalidatePath(`/mural/${petId}`);
  revalidatePath("/recordatorios");
}

/**
 * Traduce el resultado de una escritura en un `ActionState` de error, o en
 * `null` si todo fue bien.
 *
 * El caso de «cero filas» es el que importa: significa que la fila no existe o
 * que la RLS no deja tocarla. Se responde igual en los dos casos a propósito —
 * distinguirlos le confirmaría a quien va probando identificadores que ese
 * registro existe y es de otra persona.
 */
function denyIfUntouched(
  result: { data: unknown[] | null; error: { code?: string; message: string } | null },
  what: string,
): ActionState | null {
  if (result.error) return errorState(describeDatabaseError(result.error));
  if (!result.data || result.data.length === 0) {
    return errorState(`No se encontró ${what}, o no es tuyo.`);
  }
  return null;
}

/**
 * ¿Es tuya esta mascota?
 *
 * Sólo hace falta cuando hay un efecto secundario ANTES de escribir en la base
 * de datos —subir una foto al almacenamiento, hoy el único caso—. En el resto
 * de acciones la propia escritura ya es la comprobación.
 */
async function ownsPet(db: Db, petId: string, ownerId: string): Promise<boolean> {
  // El filtro por `owner_id` NO es adorno aquí: la RLS de `pets` tiene además
  // la política `pets_public_select`, y las políticas del mismo comando se
  // suman (OR). Sin este filtro, un simple `select id` daba por buena
  // cualquier mascota del mural público —aunque fuese de otra persona—, que es
  // justo lo contrario de lo que esta función tiene que responder.
  const { data } = await db
    .from("pets")
    .select("id")
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return Boolean(data);
}

/** Generaciones de ancestros que se cargan al buscar ciclos. De sobra para
 * cualquier árbol real; el disparador de Postgres cubre lo que quede fuera. */
const MAX_ANCESTOR_GENERATIONS = 30;

/**
 * Valida el padre y la madre de una mascota antes de escribirlos: tienen que
 * ser visibles (propios o públicos del mural), de la misma especie, de sexo
 * compatible, y no pueden convertir a la mascota en su propio ascendiente.
 *
 * Devuelve el `ActionState` de error, o `null` si todo está en orden. Sólo se
 * comprueban los vínculos que *cambian* respecto a `existing`: si un progenitor
 * dejó de ser público, conservarlo tal cual no es un error — retirarlo a la
 * fuerza sí perdería datos.
 */
async function validateParentage(
  db: Db,
  userId: string,
  input: { fatherId: string | null; motherId: string | null; species: Species },
  existing: { petId: string; fatherId: string | null; motherId: string | null } | null,
): Promise<ActionState | null> {
  const roles = [
    { field: "fatherId" as const, label: "padre", id: input.fatherId, forbiddenSex: "female" },
    { field: "motherId" as const, label: "madre", id: input.motherId, forbiddenSex: "male" },
  ];

  if (existing && roles.some((role) => role.id === existing.petId)) {
    return errorState("Una mascota no puede ser su propio padre o madre.");
  }

  const changed = roles.filter(
    (role) => role.id != null && role.id !== (existing ? existing[role.field] : null),
  );
  if (changed.length === 0) return null;

  // La RLS ya limita la lectura a «mías + públicas no ocultas», pero aquí la
  // comprobación se repite en código: es la regla de negocio, no un adorno.
  const { data, error } = await db
    .from("pets")
    .select("id, owner_id, species, sex, is_public, hidden_by_admin")
    .in(
      "id",
      changed.map((role) => role.id!),
    );
  if (error) return errorState(describeDatabaseError(error));
  const candidates = new Map((data ?? []).map((row) => [row.id, row]));

  for (const role of changed) {
    const row = candidates.get(role.id!);
    if (!row || !(row.owner_id === userId || (row.is_public && !row.hidden_by_admin))) {
      return errorState("Revisa los campos marcados.", {
        [role.field]: ["Esa mascota ya no está disponible."],
      });
    }
    if (row.sex === role.forbiddenSex) {
      const expected = role.field === "fatherId" ? "macho" : "hembra";
      return errorState("Revisa los campos marcados.", {
        [role.field]: [`El ${role.label} debe ser ${expected} o de sexo sin definir.`],
      });
    }
    if (row.species !== input.species) {
      return errorState("Revisa los campos marcados.", {
        [role.field]: [`El ${role.label} debe ser de la misma especie.`],
      });
    }
  }

  // Ciclos: sólo en edición — una mascota recién creada no puede ser ancestro
  // de nadie. Se sube por generaciones sobre lo que la RLS deja ver; el
  // disparador `pets_forbid_ancestor_cycle` es el candado para lo que no.
  if (existing) {
    const linksById = new Map<string, ParentLinks>();
    let frontier = [input.fatherId, input.motherId].filter((id): id is string => Boolean(id));

    for (let depth = 0; depth < MAX_ANCESTOR_GENERATIONS && frontier.length > 0; depth += 1) {
      const pending = frontier.filter((id) => !linksById.has(id) && id !== existing.petId);
      if (pending.length === 0) break;

      const { data: rows, error: readError } = await db
        .from("pets")
        .select("id, father_id, mother_id")
        .in("id", pending);
      if (readError) return errorState(describeDatabaseError(readError));

      frontier = [];
      for (const row of rows ?? []) {
        linksById.set(row.id, { fatherId: row.father_id, motherId: row.mother_id });
        if (row.father_id) frontier.push(row.father_id);
        if (row.mother_id) frontier.push(row.mother_id);
      }
    }

    if (createsCycle(existing.petId, [input.fatherId, input.motherId], linksById)) {
      return errorState(
        "Esa mascota es descendiente de esta: el parentesco crearía un ciclo en el árbol.",
      );
    }
  }

  return null;
}

// ===========================================================================
// Cuenta
// ===========================================================================

/**
 * Traduce los errores del servidor de autenticación de Supabase, que llegan en
 * inglés. Sólo se traducen los que una persona puede provocar por su cuenta;
 * el resto cae en un mensaje genérico, porque detallarlo no la ayudaría.
 */
function describeAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    // A propósito no dice cuál de los dos falla: eso confirmaría qué correos
    // están registrados.
    return "El correo o la contraseña no son correctos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Tienes que confirmar tu correo antes de entrar. Busca el mensaje que te enviamos.";
  }
  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "Ya hay una cuenta con ese correo. Prueba a entrar.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Demasiados intentos seguidos. Espera un momento y vuelve a probar.";
  }
  if (normalized.includes("password")) {
    return "Esa contraseña no cumple los requisitos mínimos.";
  }

  return "No se pudo completar la operación. Inténtalo de nuevo.";
}

/**
 * A dónde ir después de entrar.
 *
 * El destino viene de la barra de direcciones (`?siguiente=`), así que es
 * entrada no confiable: sin este filtro, un enlace a
 * `/acceso?siguiente=https://otro-sitio` convertiría el formulario de acceso en
 * un trampolín para llevarse a la gente a otra parte con la credibilidad de
 * este dominio. Sólo se aceptan rutas internas, y `//` queda fuera porque el
 * navegador lo lee como el principio de otro dominio.
 */
function safeNextPath(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  if (!path.startsWith("/") || path.startsWith("//")) return "/mascotas";
  return path;
}

export async function signInAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseFormData(signInSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const destination = safeNextPath(formData.get("siguiente"));
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return errorState(describeAuthError(error.message));

  // Toda la interfaz cambia al iniciar sesión —la navegación, el mural, los
  // listados—, así que se invalida el árbol entero en vez de ruta a ruta.
  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signUpAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseFormData(signUpSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    // Lo recoge el disparador `handle_new_user` para rellenar
    // `profiles.display_name`. Ojo: `user_metadata` lo escribe el cliente, así
    // que sirve para el nombre y para nada más — el rol NO se toca desde aquí.
    options: { data: { display_name: input.displayName } },
  });

  if (error) return errorState(describeAuthError(error.message));

  // Si el proyecto de Supabase tiene activada la confirmación por correo —lo
  // está por defecto—, `signUp` no abre sesión: devuelve el usuario y espera a
  // que se pulse el enlace del mensaje.
  if (!data.session) {
    return successState(
      `Te hemos enviado un correo a ${input.email}. Abre el enlace para confirmar tu cuenta y ya podrás entrar.`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/mascotas");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}

// ===========================================================================
// Administración
// ===========================================================================
//
// `requireAdmin()` da un 404 a quien no lo sea, pero no es la única barrera:
// las políticas de RLS de pets y profiles exigen `public.is_admin()` para tocar
// filas ajenas. Si alguien llamara a estas acciones a pelo —son endpoints POST
// como cualquier otra— la base de datos afectaría a cero filas y
// `denyIfUntouched()` lo convertiría en un error.

/** Refresca lo que ve todo el mundo y el propio panel. */
function revalidateMural(): void {
  revalidatePath("/");
  revalidatePath("/admin");
}

/**
 * Destaca una mascota en el mural, o le quita el destacado.
 *
 * `featured_at` es lo que ordena entre las destacadas, y por eso se vuelve a
 * sellar cada vez que se destaca: volver a destacar una mascota ya destacada la
 * sube al principio. Eso es el «reordenar» del panel, sin necesidad de un campo
 * de posición que habría que recalcular en cadena cada vez.
 */
export async function setPetFeaturedAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const petId = String(formData.get("petId") ?? "");
  if (!petId) return errorState("Falta la mascota.");

  const featured = formData.get("featured") === "true";
  const db = await createClient();

  const denied = denyIfUntouched(
    await db
      .from("pets")
      .update({
        featured,
        featured_at: featured ? new Date().toISOString() : null,
      })
      .eq("id", petId)
      .select("id"),
    "esa mascota",
  );
  if (denied) return denied;

  revalidateMural();
  return successState(featured ? "Destacada en el mural." : "Ya no está destacada.");
}

/**
 * Retira una mascota del mural, o la devuelve.
 *
 * Es independiente de `is_public`, que es del dueño: basta con que una de las
 * dos diga que no para que la mascota no aparezca. Un administrador no puede
 * publicar lo que su dueño quiso privado.
 */
export async function setPetHiddenAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const petId = String(formData.get("petId") ?? "");
  if (!petId) return errorState("Falta la mascota.");

  const hidden = formData.get("hidden") === "true";
  const db = await createClient();

  const denied = denyIfUntouched(
    await db
      .from("pets")
      // Al ocultar se retira también el destacado: una mascota escondida y
      // «destacada» a la vez es un estado que no significa nada y que volvería
      // a aparecer arriba del todo el día que se restaure.
      .update(hidden ? { hidden_by_admin: true, featured: false, featured_at: null } : { hidden_by_admin: false })
      .eq("id", petId)
      .select("id"),
    "esa mascota",
  );
  if (denied) return denied;

  revalidateMural();
  return successState(hidden ? "Retirada del mural." : "Devuelta al mural.");
}

/**
 * Cambia el rol de una cuenta.
 *
 * La comprobación de que quien lo pide es administrador está por triplicado:
 * aquí, en la política de UPDATE de profiles y en el disparador
 * `guard_profile_role`. No sobra ninguna — el disparador es el único que
 * protege la columna, porque la RLS razona por filas y dejaría a cualquiera
 * ascenderse editando su propio perfil.
 */
export async function setUserRoleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!userId) return errorState("Falta la cuenta.");
  if (role !== "user" && role !== "admin") return errorState("Ese rol no existe.");

  // Quitarse a uno mismo el rol es la forma más rápida de quedarse fuera del
  // panel sin poder volver a entrar: haría falta el SQL Editor para arreglarlo.
  if (userId === admin.id && role !== "admin") {
    return errorState("No puedes quitarte a ti mismo el rol de administrador.");
  }

  const db = await createClient();

  const denied = denyIfUntouched(
    await db.from("profiles").update({ role }).eq("id", userId).select("id"),
    "esa cuenta",
  );
  if (denied) return denied;

  revalidatePath("/admin/usuarios");
  return successState(
    role === "admin" ? "Ahora es administrador." : "Ahora es una cuenta normal.",
  );
}

// ===========================================================================
// Mascotas
// ===========================================================================

export async function createPetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = parseFormData(petInputSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const input = parsed.data;
  const db = await createClient();

  const invalidParentage = await validateParentage(db, user.id, input, null);
  if (invalidParentage) return invalidParentage;

  const { data, error } = await db
    .from("pets")
    .insert({
      // La identidad la pone el servidor a partir de la sesión. Si viniera del
      // formulario, cualquiera podría dar de alta mascotas a nombre de otra
      // persona. La política `pets_owner_insert` lo rechazaría de todas formas.
      owner_id: user.id,
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
      father_id: input.fatherId,
      mother_id: input.motherId,
    })
    .select("id")
    .single();

  if (error) return errorState(describeDatabaseError(error));

  revalidatePath("/");
  revalidatePath("/mascotas");
  // Los progenitores ganan un hijo en su pestaña «Familia».
  if (input.fatherId) revalidatePet(input.fatherId);
  if (input.motherId) revalidatePet(input.motherId);
  // `redirect` lanza una excepción de control de flujo: nada se ejecuta
  // después, por eso la revalidación va antes.
  redirect(`/mascotas/${data.id}`);
}

export async function updatePetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const petId = String(formData.get("petId") ?? "");
  if (!petId) return errorState("Falta la mascota que hay que actualizar.");

  const parsed = parseFormData(petInputSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const input = parsed.data;
  const db = await createClient();

  // Los vínculos actuales, para validar sólo los que cambian. El filtro por
  // `owner_id` no es adorno (ver la nota de `ownsPet`): sin él, cualquier
  // mascota pública del mural pasaría por editable hasta el UPDATE.
  const { data: current, error: currentError } = await db
    .from("pets")
    .select("id, father_id, mother_id")
    .eq("id", petId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (currentError) return errorState(describeDatabaseError(currentError));
  if (!current) return errorState("No se encontró esa mascota, o no es tuya.");

  const invalidParentage = await validateParentage(db, user.id, input, {
    petId,
    fatherId: current.father_id,
    motherId: current.mother_id,
  });
  if (invalidParentage) return invalidParentage;

  // `owner_id` no se toca: una mascota no cambia de dueño desde el formulario.
  const result = await db
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
      father_id: input.fatherId,
      mother_id: input.motherId,
    })
    .eq("id", petId)
    .select("id");

  const denied = denyIfUntouched(result, "esa mascota");
  if (denied) return denied;

  // Bidireccional: la pestaña «Familia» de los progenitores —los que entran y
  // los que salen— lista a esta mascota entre sus hijos.
  const affected = new Set(
    [petId, current.father_id, current.mother_id, input.fatherId, input.motherId].filter(
      (id): id is string => Boolean(id),
    ),
  );
  for (const id of affected) revalidatePet(id);

  return successState("Ficha actualizada.");
}

export async function deletePetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const petId = String(formData.get("petId") ?? "");
  if (!petId) return errorState("Falta la mascota que hay que borrar.");

  const db = await createClient();

  // Las tablas hijas tienen `on delete cascade`: se van con ella.
  const result = await db.from("pets").delete().eq("id", petId).select("id");

  const denied = denyIfUntouched(result, "esa mascota");
  if (denied) return denied;

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
  await requireUser();

  const parsed = parseFormData(weightInputSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa los campos marcados.", parsed.fieldErrors);
  }

  const input = parsed.data;
  const db = await createClient();

  const { error } = await db.from("weight_entries").insert({
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
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el registro que hay que borrar.");

  const db = await createClient();
  const result = await db.from("weight_entries").delete().eq("id", id).select("id");

  const denied = denyIfUntouched(result, "ese pesaje");
  if (denied) return denied;

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
  await requireUser();

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

  const db = await createClient();

  if (id) {
    const denied = denyIfUntouched(
      await db.from("conditions").update(values).eq("id", id).select("id"),
      "ese padecimiento",
    );
    if (denied) return denied;
  } else {
    const { error } = await db.from("conditions").insert(values);
    if (error) return errorState(describeDatabaseError(error));
  }

  revalidatePet(input.petId);
  return successState(id ? "Padecimiento actualizado." : "Padecimiento registrado.");
}

export async function deleteConditionAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el padecimiento que hay que borrar.");

  const db = await createClient();
  const denied = denyIfUntouched(
    await db.from("conditions").delete().eq("id", id).select("id"),
    "ese padecimiento",
  );
  if (denied) return denied;

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
  db: Db,
  medicationId: string,
  petId: string,
  medication: { startDate: string; endDate: string | null; intervalHours: number },
  now: Date,
): Promise<void> {
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + DOSE_HORIZON_DAYS);

  const schedule = generateDoseSchedule(medication, now, horizon);
  if (schedule.length === 0) return;

  await db.from("medication_doses").upsert(
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
  await requireUser();

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

  const db = await createClient();
  const { data, error } = id
    ? await db.from("medications").update(values).eq("id", id).select("id").maybeSingle()
    : await db.from("medications").insert(values).select("id").maybeSingle();

  if (error) return errorState(describeDatabaseError(error));
  if (!data) return errorState("No se encontró ese tratamiento, o no es tuyo.");

  if (input.isActive) {
    await scheduleDoses(
      db,
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
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el tratamiento que hay que borrar.");

  const db = await createClient();
  const denied = denyIfUntouched(
    await db.from("medications").delete().eq("id", id).select("id"),
    "ese tratamiento",
  );
  if (denied) return denied;

  revalidatePet(petId);
  return successState("Tratamiento eliminado.");
}

/** Marca una toma como administrada, omitida o de nuevo pendiente. */
export async function updateDoseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const parsed = parseFormData(doseUpdateSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "No se pudo actualizar la toma.", parsed.fieldErrors);
  }

  const petId = String(formData.get("petId") ?? "");
  const input = parsed.data;
  const db = await createClient();

  const denied = denyIfUntouched(
    await db
      .from("medication_doses")
      .update({
        status: input.status,
        // La hora de administración sólo tiene sentido si se administró.
        taken_at: input.status === "taken" ? new Date().toISOString() : null,
        notes: input.notes,
      })
      .eq("id", input.doseId)
      .select("id"),
    "esa toma",
  );
  if (denied) return denied;

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
  await requireUser();

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

  const db = await createClient();

  if (id) {
    const denied = denyIfUntouched(
      await db.from("clinical_events").update(values).eq("id", id).select("id"),
      "ese evento",
    );
    if (denied) return denied;
  } else {
    const { error } = await db.from("clinical_events").insert(values);
    if (error) return errorState(describeDatabaseError(error));
  }

  revalidatePet(input.petId);
  revalidatePath("/vacunas");
  return successState(id ? "Evento actualizado." : "Evento añadido a la historia clínica.");
}

export async function deleteClinicalEventAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el evento que hay que borrar.");

  const db = await createClient();
  const denied = denyIfUntouched(
    await db.from("clinical_events").delete().eq("id", id).select("id"),
    "ese evento",
  );
  if (denied) return denied;

  revalidatePet(petId);
  revalidatePath("/vacunas");
  return successState("Evento eliminado.");
}

// ===========================================================================
// Fotos
// ===========================================================================

export async function uploadPhotoAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = parseFormData(photoUploadSchema, formData);
  if (!parsed.success) {
    return errorState(parsed.formError ?? "Revisa la imagen seleccionada.", parsed.fieldErrors);
  }

  const input = parsed.data;
  const db = await createClient();

  // Aquí SÍ hace falta comprobar antes: subir el archivo es un efecto que
  // ocurre fuera de la base de datos, y si se hiciera primero, cualquiera
  // podría dejar archivos en la carpeta de una mascota ajena aunque la fila
  // acabara rechazada por la RLS.
  if (!(await ownsPet(db, input.petId, user.id))) {
    return errorState("No se encontró esa mascota, o no es tuya.");
  }

  let stored;
  try {
    stored = await getStorage().upload(input.file, input.petId);
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "No se pudo subir la imagen.");
  }

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
  revalidatePath("/fotos");
  return successState("Foto añadida.");
}

export async function setCoverPhotoAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta la foto.");

  const db = await createClient();
  await db.from("photos").update({ is_cover: false }).eq("pet_id", petId).eq("is_cover", true);

  const denied = denyIfUntouched(
    await db.from("photos").update({ is_cover: true }).eq("id", id).select("id"),
    "esa foto",
  );
  if (denied) return denied;

  revalidatePet(petId);
  revalidatePath("/fotos");
  return successState("Portada actualizada.");
}

export async function deletePhotoAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta la foto que hay que borrar.");

  const db = await createClient();

  // Se borra la fila y se recupera su `url` en la misma operación: así el
  // archivo sólo se toca si la RLS dejó borrar la fila.
  const result = await db.from("photos").delete().eq("id", id).select("id, url");

  const denied = denyIfUntouched(result, "esa foto");
  if (denied) return denied;

  // El archivo se borra después de la fila: si esto falla, sobra un archivo,
  // que es mucho menos grave que una foto rota en la galería.
  const url = result.data?.[0]?.url;
  if (url) {
    await getStorage().remove(url.replace(/^\/uploads\//, ""));
  }

  revalidatePet(petId);
  revalidatePath("/fotos");
  return successState("Foto eliminada.");
}

// ===========================================================================
// Recordatorios
// ===========================================================================

export async function saveReminderAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

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

  const db = await createClient();

  if (id) {
    const denied = denyIfUntouched(
      await db.from("reminders").update(values).eq("id", id).select("id"),
      "ese recordatorio",
    );
    if (denied) return denied;
  } else {
    const { error } = await db.from("reminders").insert(values);
    if (error) return errorState(describeDatabaseError(error));
  }

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
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el recordatorio.");

  const db = await createClient();

  // Se marca como hecho y se recupera la fila en una sola operación: si la RLS
  // no deja tocarla, `data` viene vacío y no hay nada más que hacer.
  const result = await db
    .from("reminders")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id)
    .select("*");

  const denied = denyIfUntouched(result, "ese recordatorio");
  if (denied) return denied;

  const reminder = result.data![0];
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
  await requireUser();

  const id = String(formData.get("id") ?? "");
  const petId = String(formData.get("petId") ?? "");
  if (!id || !petId) return errorState("Falta el recordatorio que hay que borrar.");

  const db = await createClient();
  const denied = denyIfUntouched(
    await db.from("reminders").delete().eq("id", id).select("id"),
    "ese recordatorio",
  );
  if (denied) return denied;

  revalidatePet(petId);
  return successState("Recordatorio eliminado.");
}
