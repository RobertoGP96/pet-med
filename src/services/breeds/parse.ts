/**
 * Traducción de la respuesta cruda de dogapi.dog / The Cat API al perfil de
 * raza del dominio.
 *
 * Todo lo de este archivo es PURO: no hay `fetch`, ni variables de entorno, ni
 * dependencias de Next. Así se puede probar con Vitest sin tocar la red (ver
 * parse.test.ts) y el servicio (index.ts) se limita a pedir datos y mapear.
 *
 * Las dos fuentes son muy distintas: dogapi.dog ya manda números y separa el
 * peso por sexo, mientras que The Cat API manda texto libre (`"3 - 5"`,
 * `"NaN"`) y añade rasgos puntuados del 1 al 5.
 */

import type { BreedProfile, BreedTraits, BreedWeightBySex } from "@/domain/breed";
import type { Species } from "@/domain/enums";
import type { BreedWeightRange } from "@/domain/health/weight";

import type { CatApiBreed, DogApiBreed, DogApiRange } from "./api-types";

/**
 * Cualquier número del texto, con decimales por punto o por coma.
 *
 * No se busca el guion: extraer los números y quedarse con el primero y el
 * último resuelve de golpe `"23 - 25"`, `"23-25"`, el guion largo `"23 – 25"`
 * y los sufijos tipo `"10 - 12 years"`. Tampoco se admite el signo menos: ni
 * un peso ni una esperanza de vida pueden ser negativos, y aceptarlo haría que
 * `"23-25"` se leyera como `23` y `-25`.
 */
const NUMBER_PATTERN = /\d+(?:[.,]\d+)?/g;

/** Peso máximo creíble para un animal de compañía, en kilos. */
const MAX_PLAUSIBLE_WEIGHT_KG = 200;

/** Esperanza de vida máxima creíble, en años. */
const MAX_PLAUSIBLE_LIFE_SPAN_YEARS = 40;

/**
 * Base del CDN de imágenes.
 *
 * Sólo gatos: dogapi.dog no publica fotos de raza. Para perros, las imágenes
 * se piden aparte a dog.ceo (ver ./photos.ts).
 */
const IMAGE_CDN: Partial<Record<Species, string>> = {
  cat: "https://cdn2.thecatapi.com/images",
};

/** Texto opcional ya recortado; `null` si estaba vacío o no era texto. */
function cleanText(value: string | undefined | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Lee un rango escrito como texto libre.
 *
 * Devuelve `null` cuando no hay ningún número que leer (`"NaN"`, `""`,
 * `undefined`) o cuando el resultado no es finito. Con un único valor el rango
 * es degenerado: `min === max`. Si vienen al revés, se ordenan.
 */
export function parseRange(value: string | undefined | null): { min: number; max: number } | null {
  if (typeof value !== "string") return null;

  const matches = value.match(NUMBER_PATTERN);
  if (!matches || matches.length === 0) return null;

  const first = Number(matches[0].replace(",", "."));
  const last = Number(matches[matches.length - 1].replace(",", "."));
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;

  return first <= last ? { min: first, max: last } : { min: last, max: first };
}

/**
 * Rango de peso adulto en kilos, a partir del campo `weight.metric`.
 *
 * Se descartan los valores sin sentido (cero, negativos o por encima de
 * `MAX_PLAUSIBLE_WEIGHT_KG`) para que ningún indicador de salud se calcule
 * sobre un dato corrupto de la API.
 */
export function parseWeightRangeKg(metric: string | undefined | null): BreedWeightRange | null {
  const range = parseRange(metric);
  if (!range) return null;
  if (range.min <= 0 || range.max <= 0) return null;
  if (range.max > MAX_PLAUSIBLE_WEIGHT_KG) return null;

  return { minKg: range.min, maxKg: range.max };
}

/**
 * Esperanza de vida en años. Tolera el sufijo «years» que añade The Dog API y
 * que The Cat API omite.
 */
export function parseLifeSpanYears(
  value: string | undefined | null,
): { minYears: number; maxYears: number } | null {
  const range = parseRange(value);
  if (!range) return null;
  if (range.min <= 0 || range.max <= 0) return null;
  if (range.max > MAX_PLAUSIBLE_LIFE_SPAN_YEARS) return null;

  return { minYears: range.min, maxYears: range.max };
}

/**
 * URL de la foto de la raza.
 *
 * Se prefiere la que trae la propia respuesta; si no viene (es habitual: sólo
 * aparece cuando se pide con `attach_image`), se arma la del CDN a partir de
 * `reference_image_id`. Sin ninguna de las dos, `null`.
 */
export function buildImageUrl(
  species: Species,
  referenceImageId: string | undefined | null,
  imageUrl: string | undefined | null,
): string | null {
  const direct = cleanText(imageUrl);
  if (direct) return direct;

  const referenceId = cleanText(referenceImageId);
  const cdn = IMAGE_CDN[species];
  if (!referenceId || !cdn) return null;

  return `${cdn}/${referenceId}.jpg`;
}

/**
 * Rango numérico de dogapi.dog -> rango de peso del dominio.
 *
 * Aquí no hay texto que interpretar, pero sí valores incompletos: hay razas
 * con `min` y sin `max`, o con ambos a `null`.
 */
export function parseNumericWeightRange(range: DogApiRange | null | undefined): BreedWeightRange | null {
  if (!range) return null;

  const min = typeof range.min === "number" ? range.min : null;
  const max = typeof range.max === "number" ? range.max : null;
  if (min == null && max == null) return null;

  // Si sólo viene uno de los dos, el rango se degenera a ese valor.
  const minKg = min ?? max!;
  const maxKg = max ?? min!;

  if (minKg <= 0 || maxKg <= 0) return null;
  if (maxKg > MAX_PLAUSIBLE_WEIGHT_KG) return null;

  return minKg <= maxKg ? { minKg, maxKg } : { minKg: maxKg, maxKg: minKg };
}

/** Rango numérico de esperanza de vida de dogapi.dog. */
export function parseNumericLifeSpan(
  range: DogApiRange | null | undefined,
): { minYears: number; maxYears: number } | null {
  if (!range) return null;

  const min = typeof range.min === "number" ? range.min : null;
  const max = typeof range.max === "number" ? range.max : null;
  if (min == null && max == null) return null;

  const low = Math.min(min ?? max!, max ?? min!);
  const high = Math.max(min ?? max!, max ?? min!);

  if (low <= 0 || high > MAX_PLAUSIBLE_LIFE_SPAN_YEARS) return null;

  return { minYears: low, maxYears: high };
}

/**
 * Combina los rangos de macho y hembra en uno solo, para cuando no se conoce
 * el sexo de la mascota: el mínimo de los mínimos y el máximo de los máximos.
 */
export function combineWeightRanges(
  male: BreedWeightRange | null,
  female: BreedWeightRange | null,
): BreedWeightRange | null {
  if (male && female) {
    return {
      minKg: Math.min(male.minKg, female.minKg),
      maxKg: Math.max(male.maxKg, female.maxKg),
    };
  }
  return male ?? female;
}

/**
 * Perro crudo (dogapi.dog) -> perfil de raza del dominio.
 *
 * `groupNames` traduce el id de grupo que viene en `relationships` al nombre
 * legible; se resuelve aparte con /groups porque la API sigue JSON:API y no
 * incrusta el recurso.
 */
export function normalizeDogBreed(
  raw: DogApiBreed,
  groupNames?: Map<string, string>,
): BreedProfile {
  const attributes = raw.attributes ?? {};

  const male = parseNumericWeightRange(attributes.male_weight);
  const female = parseNumericWeightRange(attributes.female_weight);
  const groupId = raw.relationships?.group?.data?.id;

  return {
    id: cleanText(raw.id) ?? "",
    name: cleanText(attributes.name) ?? "",
    species: "dog",
    weightRange: combineWeightRanges(male, female),
    // Sólo se ofrece el desglose si están los dos sexos: con uno suelto, el
    // indicador podría comparar una hembra contra el rango del macho.
    weightBySex: male && female ? ({ male, female } satisfies BreedWeightBySex) : null,
    lifeSpan: parseNumericLifeSpan(attributes.life),
    // dogapi.dog no publica temperamento ni función de cría.
    temperament: null,
    bredFor: null,
    breedGroup: groupId ? (groupNames?.get(groupId) ?? null) : null,
    description: cleanText(attributes.description),
    hypoallergenic:
      typeof attributes.hypoallergenic === "boolean" ? attributes.hypoallergenic : null,
    traits: null,
    // Las fotos de perro se piden a dog.ceo (./photos.ts).
    imageUrl: null,
  };
}

/** Convierte una puntuación 1-5; descarta lo que no sea un número en rango. */
function parseTrait(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 1 || value > 5) return null;
  return value;
}

function extractCatTraits(raw: CatApiBreed): BreedTraits {
  return {
    energyLevel: parseTrait(raw.energy_level),
    grooming: parseTrait(raw.grooming),
    sheddingLevel: parseTrait(raw.shedding_level),
    healthIssues: parseTrait(raw.health_issues),
    socialNeeds: parseTrait(raw.social_needs),
    childFriendly: parseTrait(raw.child_friendly),
    dogFriendly: parseTrait(raw.dog_friendly),
    strangerFriendly: parseTrait(raw.stranger_friendly),
    vocalisation: parseTrait(raw.vocalisation),
    intelligence: parseTrait(raw.intelligence),
    affectionLevel: parseTrait(raw.affection_level),
    adaptability: parseTrait(raw.adaptability),
  };
}

/** Gato crudo -> perfil de raza del dominio. */
export function normalizeCatBreed(raw: CatApiBreed): BreedProfile {
  return {
    id: cleanText(raw.id) ?? "",
    name: cleanText(raw.name) ?? "",
    species: "cat",
    weightRange: parseWeightRangeKg(raw.weight?.metric),
    // The Cat API publica un único rango, sin distinguir sexo.
    weightBySex: null,
    lifeSpan: parseLifeSpanYears(raw.life_span),
    temperament: cleanText(raw.temperament),
    // The Cat API no publica «bred_for»: los gatos no se criaron para una
    // tarea, así que el campo se deja vacío en vez de rellenarlo con otra cosa.
    // Como «breed_group» tampoco existe, se usa el país de origen, que es el
    // dato equivalente que sí publica.
    bredFor: null,
    breedGroup: cleanText(raw.origin),
    description: cleanText(raw.description),
    // Llega como 0/1, no como booleano.
    hypoallergenic: typeof raw.hypoallergenic === "number" ? raw.hypoallergenic === 1 : null,
    traits: extractCatTraits(raw),
    imageUrl: buildImageUrl("cat", raw.reference_image_id, raw.image?.url),
  };
}
