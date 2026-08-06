/**
 * Nombres y reseñas de raza en español.
 *
 * Los dos catálogos publican en inglés y no ofrecen ningún parámetro de idioma,
 * así que la traducción se hizo una vez y vive en dogs.json y cats.json. No se
 * traduce en tiempo de ejecución a propósito: haría falta una clave de un
 * servicio de traducción, sumaría latencia a cada render y metería un punto de
 * fallo en lo que sólo es un adorno de la ficha.
 *
 * La clave es el nombre inglés plegado (`foldKey`), no el id de la API:
 * dogapi.dog reparte UUID que no hay garantía de que sobrevivan a un
 * redespliegue suyo, mientras que el nombre es estable. De paso, así también se
 * encuentra la raza que el dueño escribió a mano.
 *
 * MÓDULO PURO. Para regenerar los JSON cuando las APIs añadan razas, ver el
 * apartado «Traducciones» del README.
 */

import type { Species } from "@/domain/enums";

import catsJson from "./cats.json";
import dogsJson from "./dogs.json";
import { foldKey } from "./vocabulary";

/** Lo que se tradujo de cada raza. */
export interface BreedText {
  name: string;
  description: string;
}

type Catalog = Record<string, BreedText>;

const CATALOGS: Partial<Record<Species, Catalog>> = {
  dog: dogsJson as Catalog,
  cat: catsJson as Catalog,
};

/**
 * Índice inverso nombre en español -> nombre en inglés.
 *
 * Hace falta porque lo que se guarda de una mascota es el nombre que se eligió
 * en el formulario, que ya está en español, y dog.ceo sólo entiende inglés.
 * Se construye una vez al cargar el módulo: son 350 entradas.
 */
const SOURCE_NAMES: Partial<Record<Species, Map<string, string>>> = {};

function getSourceNames(species: Species): Map<string, string> {
  const cached = SOURCE_NAMES[species];
  if (cached) return cached;

  const index = new Map<string, string>();
  for (const [sourceKey, text] of Object.entries(CATALOGS[species] ?? {})) {
    const translatedKey = foldKey(text.name);
    // Sólo interesa cuando la traducción cambió algo; si el nombre se dejó
    // igual («Beagle»), la entrada sobra. Y no se pisa una ya puesta: dos razas
    // distintas nunca deberían compartir nombre español, pero si pasara, manda
    // la primera y no una al azar.
    if (translatedKey !== sourceKey && !index.has(translatedKey)) {
      index.set(translatedKey, sourceKey);
    }
  }

  SOURCE_NAMES[species] = index;
  return index;
}

/**
 * Traducción de una raza a partir de su nombre en inglés, o `null` si no está
 * en el catálogo traducido (una raza que la API haya añadido después).
 */
export function findBreedText(species: Species, sourceName: string): BreedText | null {
  const key = foldKey(sourceName ?? "");
  if (!key) return null;

  return CATALOGS[species]?.[key] ?? null;
}

/**
 * Nombre de raza listo para pintar.
 *
 * Lo que se guarda de una mascota es lo que se escribió en el formulario, y ahí
 * hay de todo: las fichas dadas de alta antes de que existieran las
 * traducciones tienen el nombre inglés del catálogo («Dalmatian»), las de ahora
 * el español («Dálmata») y siempre puede haber una escrita a mano. Sólo se
 * cambia lo que se reconoce; el resto se respeta tal cual, que es dato del
 * dueño y no nuestro.
 *
 * No se traduce en el mapper a propósito: `pet.breed` es lo que la persona
 * escribió y el formulario de edición tiene que seguir enseñándoselo igual.
 */
export function toDisplayBreedName(species: Species, name: string): string {
  return findBreedText(species, name)?.name ?? name;
}

/**
 * Nombre en inglés que corresponde a `name`, para lo que sólo entiende el
 * idioma de origen (hoy, emparejar con dog.ceo).
 *
 * Si `name` ya venía en inglés, o si es una raza escrita a mano que no está en
 * el catálogo, se devuelve tal cual: quien llama sabe apañarse con eso.
 */
export function toSourceBreedName(species: Species, name: string): string {
  const key = foldKey(name ?? "");
  if (!key) return name;

  return getSourceNames(species).get(key) ?? name;
}
