/**
 * Esquemas de validación (zod 4).
 *
 * Son la única frontera de confianza entre lo que llega de un formulario y lo
 * que toca la base de datos: toda server action valida su entrada aquí antes
 * de escribir. Los tipos `…Input` se infieren del esquema, nunca al revés.
 *
 * Los formularios HTML mandan siempre strings, así que los helpers de abajo
 * normalizan "" -> null y convierten números y checkboxes.
 */

import { z } from "zod";

import {
  CLINICAL_EVENT_TYPES,
  CONDITION_CATEGORIES,
  CONDITION_STATUSES,
  DOSE_STATUSES,
  MEDICATION_ROUTES,
  RECURRENCES,
  REMINDER_TYPES,
  SEVERITIES,
  SEXES,
  SIZES,
  SPECIES,
} from "./enums";

// --- Helpers ---------------------------------------------------------------

/** Texto obligatorio, recortado. */
const requiredText = (max = 120, message = "Este campo es obligatorio") =>
  z.string().trim().min(1, message).max(max, `Máximo ${max} caracteres`);

/** Texto opcional: "" y undefined se guardan como null. */
const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .nullable()
    .optional()
    .transform((value) => (value == null || value.length === 0 ? null : value));

/** Fecha `YYYY-MM-DD` obligatoria. */
const requiredDate = z.iso.date("Introduce una fecha válida");

/** Fecha `YYYY-MM-DD` opcional. */
const optionalDate = z
  .union([z.iso.date("Introduce una fecha válida"), z.literal("")])
  .nullable()
  .optional()
  .transform((value) => (value == null || value === "" ? null : value));

/** Fecha con hora ISO obligatoria. */
const requiredDateTime = z.iso.datetime({
  offset: true,
  message: "Introduce una fecha y hora válidas",
});

/** Número obligatorio dentro de un rango. */
const numberInRange = (min: number, max: number, message: string) =>
  z.coerce.number<number>().min(min, message).max(max, message);

/** Número opcional: "" y undefined se guardan como null. */
const optionalNumber = (min: number, max: number, message: string) =>
  z
    .union([z.coerce.number<number>().min(min, message).max(max, message), z.literal("")])
    .nullable()
    .optional()
    .transform((value) => (value == null || value === "" ? null : value));

/** Checkbox HTML: presente ("on"/"true") -> true, ausente -> false. */
const checkbox = z
  .union([z.boolean(), z.string()])
  .nullable()
  .optional()
  .transform((value) => value === true || value === "on" || value === "true");

const uuid = z.uuid("Identificador no válido");

// --- Cuenta ----------------------------------------------------------------

/**
 * Longitud mínima de contraseña.
 *
 * Supabase rechaza por su cuenta cualquier cosa por debajo de 6, pero el error
 * llegaría en inglés y después de dar el viaje al servidor de autenticación.
 * Ocho es además lo que recomienda el NIST, y validarlo aquí permite decirlo en
 * español y junto al campo.
 */
const MIN_PASSWORD_LENGTH = 8;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Escribe tu correo")
  .pipe(z.email("Ese correo no parece válido"));

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres`)
  .max(72, "La contraseña no puede pasar de 72 caracteres");

export const signInSchema = z.object({
  email,
  // Al entrar no se valida la longitud: la contraseña ya existe, y exigirle
  // una forma sólo serviría para delatar cuál es la regla. Si no coincide, lo
  // dirá Supabase.
  password: z.string().min(1, "Escribe tu contraseña"),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    displayName: requiredText(60, "¿Cómo quieres que te llamemos?"),
    email,
    password,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Las dos contraseñas no coinciden",
    path: ["passwordConfirm"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

// --- Mascota ---------------------------------------------------------------

export const petInputSchema = z.object({
  name: requiredText(60, "Ponle un nombre a tu mascota"),
  species: z.enum(SPECIES),
  breed: optionalText(80),
  breedRefId: optionalText(40),
  size: z
    .union([z.enum(SIZES), z.literal("")])
    .nullable()
    .optional()
    .transform((value) => (value == null || value === "" ? null : value)),
  sex: z.enum(SEXES).default("unknown"),
  birthDate: optionalDate,
  adoptionDate: optionalDate,
  color: optionalText(60),
  microchip: optionalText(40),
  sterilized: checkbox,
  bio: optionalText(600),
  avatarUrl: optionalText(500),
  isPublic: checkbox,
});

export type PetInput = z.infer<typeof petInputSchema>;

// --- Peso ------------------------------------------------------------------

export const weightInputSchema = z.object({
  petId: uuid,
  measuredAt: requiredDate,
  weightKg: numberInRange(0.05, 200, "El peso debe estar entre 0,05 y 200 kg"),
  bodyConditionScore: optionalNumber(1, 9, "La condición corporal va de 1 a 9"),
  notes: optionalText(500),
});

export type WeightInput = z.infer<typeof weightInputSchema>;

// --- Padecimientos ---------------------------------------------------------

export const conditionInputSchema = z
  .object({
    petId: uuid,
    name: requiredText(120, "Indica el padecimiento"),
    category: z.enum(CONDITION_CATEGORIES).default("other"),
    severity: z.enum(SEVERITIES).default("mild"),
    status: z.enum(CONDITION_STATUSES).default("active"),
    diagnosedAt: requiredDate,
    resolvedAt: optionalDate,
    notes: optionalText(2000),
  })
  .refine((data) => !data.resolvedAt || data.resolvedAt >= data.diagnosedAt, {
    message: "La fecha de resolución no puede ser anterior al diagnóstico",
    path: ["resolvedAt"],
  });

export type ConditionInput = z.infer<typeof conditionInputSchema>;

// --- Medicamentos ----------------------------------------------------------

export const medicationInputSchema = z
  .object({
    petId: uuid,
    conditionId: z
      .union([uuid, z.literal("")])
      .nullable()
      .optional()
      .transform((value) => (value == null || value === "" ? null : value)),
    name: requiredText(120, "Indica el nombre del medicamento"),
    dose: numberInRange(0.001, 10000, "Introduce una dosis válida"),
    doseUnit: requiredText(20, "Indica la unidad (mg, ml, comprimido…)"),
    route: z.enum(MEDICATION_ROUTES).default("oral"),
    intervalHours: numberInRange(1, 8760, "El intervalo va de 1 hora a 1 año"),
    startDate: requiredDate,
    endDate: optionalDate,
    instructions: optionalText(1000),
    isActive: checkbox,
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "La fecha de fin no puede ser anterior al inicio",
    path: ["endDate"],
  });

export type MedicationInput = z.infer<typeof medicationInputSchema>;

export const doseUpdateSchema = z.object({
  doseId: uuid,
  status: z.enum(DOSE_STATUSES),
  notes: optionalText(500),
});

export type DoseUpdateInput = z.infer<typeof doseUpdateSchema>;

// --- Historia clínica ------------------------------------------------------

export const clinicalEventInputSchema = z.object({
  petId: uuid,
  type: z.enum(CLINICAL_EVENT_TYPES).default("visit"),
  title: requiredText(160, "Ponle un título al evento"),
  occurredAt: requiredDate,
  vetName: optionalText(120),
  clinic: optionalText(120),
  description: optionalText(4000),
  nextDueAt: optionalDate,
});

export type ClinicalEventInput = z.infer<typeof clinicalEventInputSchema>;

// --- Fotos -----------------------------------------------------------------

export const photoInputSchema = z.object({
  petId: uuid,
  url: requiredText(500, "Falta la imagen"),
  caption: optionalText(300),
  takenAt: optionalDate,
  isCover: checkbox,
});

export type PhotoInput = z.infer<typeof photoInputSchema>;

/** Límites de subida, compartidos por el cliente y por la server action. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const photoUploadSchema = z.object({
  petId: uuid,
  caption: optionalText(300),
  takenAt: optionalDate,
  isCover: checkbox,
  file: z
    .instanceof(File, { message: "Selecciona una imagen" })
    .refine((file) => file.size > 0, "Selecciona una imagen")
    .refine((file) => file.size <= MAX_PHOTO_BYTES, "La imagen no puede superar los 5 MB")
    .refine(
      (file) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type),
      "Formato no admitido: usa JPEG, PNG, WebP o AVIF",
    ),
});

export type PhotoUploadInput = z.infer<typeof photoUploadSchema>;

// --- Recordatorios ---------------------------------------------------------

export const reminderInputSchema = z.object({
  petId: uuid,
  type: z.enum(REMINDER_TYPES).default("custom"),
  title: requiredText(160, "Ponle un título al recordatorio"),
  dueAt: requiredDateTime,
  recurrence: z.enum(RECURRENCES).default("none"),
  medicationId: z
    .union([uuid, z.literal("")])
    .nullable()
    .optional()
    .transform((value) => (value == null || value === "" ? null : value)),
  notes: optionalText(1000),
});

export type ReminderInput = z.infer<typeof reminderInputSchema>;

// --- Utilidades ------------------------------------------------------------

/** Errores por campo, en la forma que consumen los formularios. */
export type FieldErrors = Record<string, string[]>;

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; fieldErrors: FieldErrors; formError: string | null };

/**
 * Valida un `FormData` contra un esquema y devuelve errores agrupados por
 * campo. Los campos con varios valores (checkbox múltiple, selects múltiples)
 * se recogen como array.
 */
export function parseFormData<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): ParseResult<z.output<S>> {
  const raw: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};

  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key);
    raw[key] = values.length > 1 ? values : values[0];
  }

  const result = schema.safeParse(raw);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const flattened = z.flattenError(result.error);

  return {
    success: false,
    fieldErrors: flattened.fieldErrors as FieldErrors,
    formError: flattened.formErrors[0] ?? null,
  };
}
