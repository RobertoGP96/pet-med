/**
 * Forma CRUDA de las respuestas de las APIs externas.
 *
 * Sólo se declaran los campos que el servicio consume de verdad. Nada de esto
 * sale de `src/services/breeds`: el dominio únicamente conoce `BreedProfile`
 * (src/domain/breed.ts).
 *
 * Fuentes, todas gratuitas y sin clave obligatoria:
 *   - Perros:       https://dogapi.dog/api/v2      (283 razas, formato JSON:API)
 *   - Gatos:        https://api.thecatapi.com/v1   (la clave sólo amplía la cuota)
 *   - Fotos perro:  https://dog.ceo/api
 *
 * Nota histórica: antes se usaba The Dog API (api.thedogapi.com) para perros,
 * pero desde 2026 responde 403 sin clave, así que se sustituyó por dogapi.dog,
 * que además publica el peso separado por sexo y la vida ya en números.
 */

// --- dogapi.dog (perros) ---------------------------------------------------

/** Rango numérico tal cual lo publica dogapi.dog. */
export interface DogApiRange {
  min?: number | null;
  max?: number | null;
}

export interface DogApiBreedAttributes {
  name?: string;
  description?: string | null;
  /** Esperanza de vida en años, ya numérica. */
  life?: DogApiRange | null;
  /** Peso en kilos, separado por sexo. */
  male_weight?: DogApiRange | null;
  female_weight?: DogApiRange | null;
  hypoallergenic?: boolean | null;
}

/** Recurso de raza en formato JSON:API. */
export interface DogApiBreed {
  id?: string;
  type?: string;
  attributes?: DogApiBreedAttributes;
  relationships?: {
    /** Referencia al grupo; el nombre hay que resolverlo con /groups. */
    group?: { data?: { id?: string; type?: string } | null } | null;
  } | null;
}

export interface DogApiGroup {
  id?: string;
  attributes?: { name?: string };
}

/** Envoltorio JSON:API: la colección viene siempre bajo `data`. */
export interface DogApiCollection<T> {
  data?: T[];
}

/** Curiosidad de https://dogapi.dog/api/v2/facts */
export interface DogApiFact {
  id?: string;
  attributes?: { body?: string };
}

// --- The Cat API (gatos) ---------------------------------------------------

/** Peso publicado, siempre como texto: `"3 - 5"`, `"7"` o incluso `"NaN"`. */
export interface ApiWeight {
  /** Libras. No se usa: el dominio trabaja en kilos. */
  imperial?: string;
  /** Kilos. Es el que se normaliza. */
  metric?: string;
}

/** Imagen destacada. Puede faltar entera o venir sin `url`. */
export interface ApiImage {
  url?: string;
}

/** Elemento de https://api.thecatapi.com/v1/breeds */
export interface CatApiBreed {
  /** Código corto de cuatro letras: `"abys"`, `"beng"`… */
  id?: string;
  name?: string;
  weight?: ApiWeight;
  /** Rango en años, casi siempre sin sufijo: `"14 - 15"`. */
  life_span?: string;
  temperament?: string;
  /** País de origen: `"Egypt"`. */
  origin?: string;
  /** Párrafo descriptivo de la raza. */
  description?: string;
  image?: ApiImage;
  reference_image_id?: string;
  /** 0 o 1, no un booleano. */
  hypoallergenic?: number;

  // Rasgos puntuados de 1 a 5.
  energy_level?: number;
  grooming?: number;
  shedding_level?: number;
  health_issues?: number;
  social_needs?: number;
  child_friendly?: number;
  dog_friendly?: number;
  stranger_friendly?: number;
  vocalisation?: number;
  intelligence?: number;
  affection_level?: number;
  adaptability?: number;
}

// --- dog.ceo (fotos por raza) ----------------------------------------------

export interface DogCeoListResponse {
  /** Mapa raza -> subrazas: `{ retriever: ["golden", "labrador"] }`. */
  message?: Record<string, string[]>;
  status?: string;
}

export interface DogCeoImagesResponse {
  message?: string[] | string;
  status?: string;
}
