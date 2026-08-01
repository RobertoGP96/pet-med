/**
 * Curiosidades caninas de https://dogapi.dog/api/v2/facts (sin clave).
 *
 * MÓDULO SÓLO DE SERVIDOR. Como el resto del servicio, nunca lanza: si la API
 * falla, el bloque «¿Sabías que…?» simplemente no se pinta.
 */

import { cache } from "react";

import type { DogApiCollection, DogApiFact } from "./api-types";

const FACTS_URL = "https://dogapi.dog/api/v2/facts";

/**
 * La API ignora los `limit` grandes y devuelve un solo hecho: con 3 responde
 * 3, con 20 responde 1. Se pide el máximo que se ha comprobado que respeta.
 */
const MAX_FACTS_PER_REQUEST = 5;

/** Un día: son curiosidades, no hace falta refrescarlas más a menudo. */
const REVALIDATE_SECONDS = 60 * 60 * 24;

export const DOG_FACTS_CACHE_TAG = "dog-facts";

export async function listDogFacts(limit = 3): Promise<string[]> {
  const requested = Math.max(1, Math.min(limit, MAX_FACTS_PER_REQUEST));

  try {
    const response = await fetch(`${FACTS_URL}?limit=${requested}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: REVALIDATE_SECONDS, tags: [DOG_FACTS_CACHE_TAG] },
    });

    if (!response.ok) {
      throw new Error(`La API de curiosidades respondió ${response.status}`);
    }

    const payload = (await response.json()) as DogApiCollection<DogApiFact>;

    return (payload.data ?? [])
      .map((fact) => fact.attributes?.body?.trim())
      .filter((body): body is string => Boolean(body && body.length > 0));
  } catch (error) {
    console.warn("[breeds] No se pudieron obtener curiosidades de perros.", error);
    return [];
  }
}

/** Una sola curiosidad, o `null` si la API no responde. */
export const getDogFact = cache(async function getDogFact(): Promise<string | null> {
  const facts = await listDogFacts(3);
  return facts[0] ?? null;
});
