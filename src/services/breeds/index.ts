/**
 * Catálogo de razas de dogapi.dog (perros) y The Cat API (gatos).
 *
 * MÓDULO SÓLO DE SERVIDOR: se apoya en `process.env` y en las opciones de
 * caché que Next añade a `fetch`, así que nunca debe importarse desde un
 * componente de cliente. (No se usa el paquete `server-only` porque no está
 * instalado en el proyecto; esta nota hace de sustituto.)
 *
 * Reglas de la casa:
 *   - Ninguna función exportada lanza. Los datos de raza son un adorno del
 *     perfil de la mascota: si la API falla, la ficha se pinta igual sin ellos.
 *   - La caché es la de `fetch` de Next (`next: { revalidate, tags }`). Nada de
 *     `unstable_cache` ni de `"use cache"`: en este proyecto la bandera
 *     `cacheComponents` está desactivada.
 *   - Para invalidar a mano: `revalidateTag("breeds")`.
 *   - `listBreeds` va envuelto en `cache()` de React porque pasarle un `signal`
 *     a `fetch` lo deja fuera de la memoización por render de Next: sin esto,
 *     dos componentes que resuelvan una raza en el mismo render releerían y
 *     reparsearían el catálogo entero dos veces.
 */

import { cache } from "react";

import type { BreedProfile } from "@/domain/breed";
import type { Species } from "@/domain/enums";

import type {
  CatApiBreed,
  DogApiBreed,
  DogApiCollection,
  DogApiGroup,
} from "./api-types";
import { normalizeCatBreed, normalizeDogBreed } from "./parse";

/** Una semana: la lista de razas es prácticamente estática. */
const REVALIDATE_SECONDS = 60 * 60 * 24 * 7;

/** Etiqueta de caché para invalidar el catálogo con `revalidateTag`. */
export const BREEDS_CACHE_TAG = "breeds";

/** Corte de la petición para que una API colgada no bloquee un render. */
const REQUEST_TIMEOUT_MS = 8000;

/** dogapi.dog devuelve el catálogo completo (283 razas) en una sola respuesta. */
const DOG_BREEDS_URL = "https://dogapi.dog/api/v2/breeds";
const DOG_GROUPS_URL = "https://dogapi.dog/api/v2/groups";
const CAT_BREEDS_URL = "https://api.thecatapi.com/v1/breeds";

/** Especies con catálogo público. Del resto no hay datos de raza. */
type CatalogSpecies = "dog" | "cat";

function hasCatalog(species: Species): species is CatalogSpecies {
  return species === "dog" || species === "cat";
}

/**
 * Clave opcional de The Cat API. Sin ella responde igual, sólo que con un
 * límite de peticiones más bajo (de sobra con la caché de una semana).
 *
 * dogapi.dog no usa claves. La antigua `DOG_API_KEY` ya no se lee.
 */
function getCatApiKey(): string | null {
  const trimmed = process.env.CAT_API_KEY?.trim();
  return trimmed ? trimmed : null;
}

/** GET + JSON con caché y tiempo máximo. Lanza si la respuesta no es 2xx. */
async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: "application/json", ...headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: REVALIDATE_SECONDS, tags: [BREEDS_CACHE_TAG] },
  });

  if (!response.ok) {
    throw new Error(`${url} respondió ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as unknown;
}

/** Descarta las entradas que se quedaron sin id o sin nombre al normalizar. */
function isUsable(breed: BreedProfile): boolean {
  return breed.id.length > 0 && breed.name.length > 0;
}

/**
 * Mapa id de grupo -> nombre ("Working", "Herding"…).
 *
 * dogapi.dog sigue JSON:API: la raza sólo trae la *referencia* al grupo, no su
 * nombre. Si /groups falla, las razas se quedan sin grupo pero todo lo demás
 * sigue funcionando.
 */
async function fetchDogGroupNames(): Promise<Map<string, string>> {
  const names = new Map<string, string>();

  try {
    const payload = (await fetchJson(DOG_GROUPS_URL)) as DogApiCollection<DogApiGroup>;
    for (const group of payload.data ?? []) {
      if (group.id && group.attributes?.name) names.set(group.id, group.attributes.name);
    }
  } catch (error) {
    console.warn("[breeds] No se pudieron leer los grupos de razas de perro.", error);
  }

  return names;
}

/**
 * Catálogo completo de una especie, ya normalizado.
 *
 * Devuelve `[]` ante cualquier problema (red, respuesta no 2xx, JSON
 * corrupto, tiempo agotado) dejando aviso en consola. Las especies sin
 * catálogo ni siquiera abren conexión.
 */
export const listBreeds = cache(async function listBreeds(
  species: Species,
): Promise<BreedProfile[]> {
  if (!hasCatalog(species)) return [];

  try {
    if (species === "dog") {
      const [payload, groupNames] = await Promise.all([
        fetchJson(DOG_BREEDS_URL) as Promise<DogApiCollection<DogApiBreed>>,
        fetchDogGroupNames(),
      ]);

      const items = payload.data;
      if (!Array.isArray(items)) {
        console.warn("[breeds] El catálogo de perros no vino con `data`; se ignora.");
        return [];
      }

      return items.map((item) => normalizeDogBreed(item, groupNames)).filter(isUsable);
    }

    const headers: Record<string, string> = {};
    const apiKey = getCatApiKey();
    if (apiKey) headers["x-api-key"] = apiKey;

    const payload = await fetchJson(CAT_BREEDS_URL, headers);
    if (!Array.isArray(payload)) {
      console.warn("[breeds] El catálogo de gatos no vino como lista; se ignora.");
      return [];
    }

    return (payload as CatApiBreed[]).map(normalizeCatBreed).filter(isUsable);
  } catch (error) {
    console.warn(`[breeds] No se pudo obtener el catálogo de ${species}.`, error);
    return [];
  }
})

/** Quita acentos y mayúsculas para poder comparar nombres escritos a mano. */
function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Busca por el id de la API de origen (`"36"` en perros, `"abys"` en gatos). */
export async function findBreedById(
  species: Species,
  breedRefId: string,
): Promise<BreedProfile | null> {
  const wanted = breedRefId?.trim();
  if (!wanted) return null;

  const breeds = await listBreeds(species);
  return breeds.find((breed) => breed.id === wanted) ?? null;
}

/**
 * Busca por nombre sin distinguir mayúsculas ni acentos, en tres pasadas:
 * coincidencia exacta, luego por prefijo y por último por contenido. El orden
 * importa: así «bulldog» devuelve «Bulldog» y no «American Bulldog», y sólo se
 * cae a la coincidencia parcial cuando no hay nada mejor.
 *
 * Se prueba contra los dos nombres, el español y el inglés de la API: una
 * mascota dada de alta antes de que hubiera traducciones tiene guardado
 * «German Shepherd Dog», y una de ahora, «Pastor Alemán». Las dos deben
 * encontrar su ficha.
 */
export async function findBreedByName(
  species: Species,
  name: string,
): Promise<BreedProfile | null> {
  const wanted = foldText(name ?? "");
  if (!wanted) return null;

  const breeds = await listBreeds(species);
  if (breeds.length === 0) return null;

  const folded = breeds.map((breed) => ({
    breed,
    // Sin repetidos: en las razas que no se traducen los dos nombres coinciden.
    names: [...new Set([foldText(breed.name), foldText(breed.sourceName)])],
  }));

  const findBy = (matches: (candidate: string) => boolean) =>
    folded.find((entry) => entry.names.some(matches))?.breed;

  return (
    findBy((candidate) => candidate === wanted) ??
    findBy((candidate) => candidate.startsWith(wanted)) ??
    findBy((candidate) => candidate.includes(wanted)) ??
    null
  );
}

/**
 * Punto de entrada único de la aplicación: la mascota guarda un id de raza
 * (si se eligió del catálogo) y/o un nombre escrito a mano. Se prueba primero
 * el id, que es exacto, y se cae al nombre si no hay suerte.
 */
export async function resolveBreedProfile(
  species: Species,
  breedRefId: string | null,
  breedName: string | null,
): Promise<BreedProfile | null> {
  if (!hasCatalog(species)) return null;

  try {
    if (breedRefId) {
      const byId = await findBreedById(species, breedRefId);
      if (byId) return byId;
    }

    if (breedName) {
      return await findBreedByName(species, breedName);
    }

    return null;
  } catch (error) {
    console.warn(`[breeds] No se pudo resolver la raza de ${species}.`, error);
    return null;
  }
}
