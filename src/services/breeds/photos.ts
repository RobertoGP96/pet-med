/**
 * Fotos de raza de https://dog.ceo/api (sin clave).
 *
 * Sirven de relleno cuando una mascota todavía no tiene foto propia. Nunca
 * sustituyen a una foto real: quien llama comprueba primero si la hay.
 *
 * MÓDULO SÓLO DE SERVIDOR.
 */

import { cache } from "react";

import type { DogCeoImagesResponse, DogCeoListResponse } from "./api-types";
import { toSourceBreedName } from "./i18n/breeds";

const BREEDS_LIST_URL = "https://dog.ceo/api/breeds/list/all";
const RANDOM_IMAGES_URL = "https://dog.ceo/api/breeds/image/random";
const REVALIDATE_SECONDS = 60 * 60 * 24 * 7;
const CACHE_TAG = "dog-photos";

/** Tope que acepta dog.ceo en `/breeds/image/random/{n}`. */
const MAX_RANDOM_IMAGES = 50;

/**
 * Corte de la petición, más holgado que los 8 s del resto del servicio.
 *
 * Aquí hace falta una petición por raza —dog.ceo no tiene endpoint que
 * devuelva varias— y un render puede lanzar unas cuantas seguidas. Quien las
 * pida en tanda debe limitar la concurrencia (ver <BreedShowcase>); este margen
 * es sólo para que un pico de latencia no tire una foto por los pelos.
 */
const REQUEST_TIMEOUT_MS = 12_000;

/**
 * Rutas que entiende dog.ceo, ya aplanadas.
 *
 * La API agrupa por raza y subraza (`{ retriever: ["golden", "labrador"] }`),
 * pero en la URL el orden se invierte: `/breed/retriever/golden`. Aquí se
 * guarda la ruta lista para usar junto con los tokens con los que comparar.
 */
interface DogCeoBreedEntry {
  /** Segmento para la URL: `"retriever/golden"`. */
  path: string;
  /** Palabras sueltas para el emparejamiento: `["retriever", "golden"]`. */
  tokens: string[];
}

const listDogCeoBreeds = cache(async function listDogCeoBreeds(): Promise<DogCeoBreedEntry[]> {
  try {
    const response = await fetch(BREEDS_LIST_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
    });

    if (!response.ok) throw new Error(`dog.ceo respondió ${response.status}`);

    const payload = (await response.json()) as DogCeoListResponse;
    const entries: DogCeoBreedEntry[] = [];

    for (const [breed, subBreeds] of Object.entries(payload.message ?? {})) {
      if (subBreeds.length === 0) {
        entries.push({ path: breed, tokens: [breed] });
        continue;
      }
      for (const sub of subBreeds) {
        entries.push({ path: `${breed}/${sub}`, tokens: [breed, sub] });
      }
    }

    return entries;
  } catch (error) {
    console.warn("[breeds] No se pudo leer el listado de dog.ceo.", error);
    return [];
  }
});

/** Minúsculas, sin acentos y partido en palabras de tres letras o más. */
function tokenize(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => token.length >= 3);
}

/**
 * Empareja un nombre de raza escrito a mano con una ruta de dog.ceo.
 *
 * Gana la entrada que comparte más palabras con el nombre; en caso de empate,
 * la más específica (la que tiene subraza). Así «Golden Retriever» acaba en
 * `retriever/golden` y no en `retriever` a secas.
 */
function matchBreedPath(entries: DogCeoBreedEntry[], breedName: string): string | null {
  const wanted = new Set(tokenize(breedName));
  if (wanted.size === 0) return null;

  let best: { path: string; score: number; specificity: number } | null = null;

  for (const entry of entries) {
    const score = entry.tokens.filter((token) => wanted.has(token)).length;
    if (score === 0) continue;

    const specificity = entry.tokens.length;
    if (!best || score > best.score || (score === best.score && specificity > best.specificity)) {
      best = { path: entry.path, score, specificity };
    }
  }

  return best?.path ?? null;
}

/**
 * Foto de ejemplo de la raza indicada, o `null` si no hay forma de
 * emparejarla. Sólo para perros: dog.ceo no cubre otras especies.
 *
 * El nombre llega en español —es lo que se guarda de la mascota— y dog.ceo sólo
 * conoce rutas en inglés (`retriever/golden`), así que primero se deshace la
 * traducción. Un nombre que ya venga en inglés, o uno escrito a mano que no
 * esté en el catálogo, pasa de largo y se empareja como siempre.
 */
export const getDogBreedPhoto = cache(async function getDogBreedPhoto(
  breedName: string | null,
): Promise<string | null> {
  if (!breedName?.trim()) return null;

  const entries = await listDogCeoBreeds();
  if (entries.length === 0) return null;

  const path = matchBreedPath(entries, toSourceBreedName("dog", breedName));
  if (!path) return null;

  try {
    const response = await fetch(`https://dog.ceo/api/breed/${path}/images/random`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
    });

    if (!response.ok) throw new Error(`dog.ceo respondió ${response.status}`);

    const payload = (await response.json()) as DogCeoImagesResponse;
    const image = Array.isArray(payload.message) ? payload.message[0] : payload.message;

    return typeof image === "string" && image.startsWith("https://") ? image : null;
  } catch (error) {
    console.warn(`[breeds] No se pudo obtener foto de dog.ceo para "${breedName}".`, error);
    return null;
  }
});

/**
 * Fotos de perro al azar, sin raza concreta.
 *
 * Alimenta la galería del mural. «Al azar» lo decide dog.ceo en el momento de
 * la petición, pero la respuesta se cachea una semana igual que el resto: la
 * galería cambia de vez en cuando, no en cada visita, que es justo lo que
 * queremos para que el mural no baile entre recargas.
 */
export const listRandomDogPhotos = cache(async function listRandomDogPhotos(
  count: number,
): Promise<string[]> {
  const requested = Math.max(1, Math.min(Math.trunc(count), MAX_RANDOM_IMAGES));

  try {
    const response = await fetch(`${RANDOM_IMAGES_URL}/${requested}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
    });

    if (!response.ok) throw new Error(`dog.ceo respondió ${response.status}`);

    const payload = (await response.json()) as DogCeoImagesResponse;
    const images = Array.isArray(payload.message) ? payload.message : [];

    // `next/image` sólo tiene permitido `images.dog.ceo` (ver next.config.ts):
    // cualquier otra cosa que devolviera la API rompería el render.
    return images.filter(
      (url): url is string =>
        typeof url === "string" && url.startsWith("https://images.dog.ceo/"),
    );
  } catch (error) {
    console.warn("[breeds] No se pudieron obtener fotos al azar de dog.ceo.", error);
    return [];
  }
});

export { matchBreedPath as __matchBreedPathForTests };
