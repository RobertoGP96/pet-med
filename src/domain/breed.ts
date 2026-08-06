/**
 * Perfil de raza normalizado.
 *
 * Cada API devuelve una forma distinta (dogapi.dog da el peso separado por
 * sexo y la vida ya en números; The Cat API lo manda todo como texto y añade
 * rasgos puntuados). El dominio sólo conoce esta forma ya limpia; la
 * traducción vive en src/services/breeds.
 */

import type { Sex, Species } from "./enums";
import type { BreedWeightRange } from "./health/weight";

/**
 * Rangos de peso por sexo.
 *
 * En muchas razas —sobre todo grandes— la diferencia entre macho y hembra es
 * de varios kilos, suficiente para que un rango único marque como "bajo peso"
 * a una hembra perfectamente sana.
 */
export interface BreedWeightBySex {
  male: BreedWeightRange;
  female: BreedWeightRange;
}

/**
 * Rasgos puntuados de 1 a 5. Hoy sólo los publica The Cat API; en perros
 * llegan todos a `null`.
 */
export interface BreedTraits {
  energyLevel: number | null;
  grooming: number | null;
  sheddingLevel: number | null;
  healthIssues: number | null;
  socialNeeds: number | null;
  childFriendly: number | null;
  dogFriendly: number | null;
  strangerFriendly: number | null;
  vocalisation: number | null;
  intelligence: number | null;
  affectionLevel: number | null;
  adaptability: number | null;
}

export interface BreedProfile {
  /** Id en la API de origen. */
  id: string;
  /** Nombre en español cuando hay traducción; si no, el de la API. */
  name: string;
  /**
   * Nombre tal y como lo publica la API, siempre en inglés.
   *
   * Se conserva porque hay cosas que sólo entienden el idioma de origen —hoy,
   * emparejar la raza con una foto de dog.ceo— y porque la búsqueda por nombre
   * debe encontrar la raza se escriba como se escriba.
   */
  sourceName: string;
  species: Species;
  /** Rango de peso del adulto, en kilos, sin distinguir sexo. */
  weightRange: BreedWeightRange | null;
  /** Rango por sexo cuando la fuente lo publica. */
  weightBySex: BreedWeightBySex | null;
  /** Esperanza de vida en años. */
  lifeSpan: { minYears: number; maxYears: number } | null;
  temperament: string | null;
  /** Para qué se crió la raza. */
  bredFor: string | null;
  /** Grupo de la raza (perros) u origen geográfico (gatos). */
  breedGroup: string | null;
  /** Reseña de la raza. */
  description: string | null;
  /**
   * Idioma de `description`. Es `"en"` sólo si la API estrenó una raza que
   * todavía no está traducida; lo usa el componente para marcar el `lang` y que
   * el lector de pantalla no lea inglés con fonética española.
   */
  descriptionLang: "es" | "en";
  /** `null` cuando la fuente no lo indica. */
  hypoallergenic: boolean | null;
  traits: BreedTraits | null;
  imageUrl: string | null;
}

/** Traits todo a null, para las fuentes que no los publican. */
export const EMPTY_BREED_TRAITS: BreedTraits = {
  energyLevel: null,
  grooming: null,
  sheddingLevel: null,
  healthIssues: null,
  socialNeeds: null,
  childFriendly: null,
  dogFriendly: null,
  strangerFriendly: null,
  vocalisation: null,
  intelligence: null,
  affectionLevel: null,
  adaptability: null,
};

/** Esperanza de vida representativa: el punto medio del rango publicado. */
export function getAverageLifeSpan(breed: BreedProfile | null): number | null {
  if (!breed?.lifeSpan) return null;
  return (breed.lifeSpan.minYears + breed.lifeSpan.maxYears) / 2;
}

/**
 * Rango de peso que corresponde a una mascota concreta.
 *
 * Si se conoce el sexo y la fuente publica rangos separados, se usa el suyo;
 * si no, el rango general. Devuelve `null` si no hay ningún dato.
 */
export function getWeightRangeForSex(
  breed: BreedProfile | null,
  sex: Sex,
): BreedWeightRange | null {
  if (!breed) return null;
  if (breed.weightBySex && (sex === "male" || sex === "female")) {
    return breed.weightBySex[sex];
  }
  return breed.weightRange;
}

/** ¿Tiene algún rasgo puntuado que merezca la pena mostrar? */
export function hasTraits(breed: BreedProfile | null): boolean {
  if (!breed?.traits) return false;
  return Object.values(breed.traits).some((value) => value != null);
}

/**
 * Deduce el tamaño a partir del peso máximo de la raza, para las mascotas a
 * las que no se les asignó tamaño a mano.
 */
export function inferSizeFromWeight(maxKg: number): "small" | "medium" | "large" | "giant" {
  if (maxKg < 10) return "small";
  if (maxKg < 25) return "medium";
  if (maxKg < 45) return "large";
  return "giant";
}
