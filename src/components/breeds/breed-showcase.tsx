import Image from "next/image";

import { BreedCard, type FeaturedBreed } from "@/components/breeds/breed-card";
import { Eyebrow } from "@/components/ui/section";
import { findBreedByName } from "@/services/breeds";
import { findBreedText } from "@/services/breeds/i18n/breeds";
import { getDogBreedPhoto, listRandomDogPhotos } from "@/services/breeds/photos";

/**
 * Razas de la guía.
 *
 * Escritas con el nombre inglés del catálogo, que es el que no cambia: las
 * fichas se pintan traducidas igual (`findBreedByName` busca en los dos
 * idiomas), pero si un día se retocara una traducción, la lista seguiría
 * encontrando su raza. Son razas conocidas y presentes en las dos fuentes, para
 * que la sección no salga medio vacía.
 */
const FEATURED_BREEDS = [
  "Labrador Retriever",
  "Golden Retriever",
  "Beagle",
  "Bulldog",
  "Poodle",
  "Boxer",
  "Border Collie",
  "Dachshund",
  "Chihuahua",
];

/** Fotos de la tira inferior. Seis llenan las dos filas de tres en móvil. */
const GALLERY_SIZE = 6;

/**
 * Cuántas razas se resuelven a la vez.
 *
 * dog.ceo necesita una petición por raza —no hay endpoint que devuelva varias—
 * y aguanta mal las ráfagas: con las nueve a la vez su latencia de cola se
 * dispara y las últimas se comen el corte de 8 segundos. En tandas de tres
 * responde en torno al segundo y medio y no se pierde ninguna foto.
 */
const PHOTO_BATCH = 3;

const CARD_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";
const GALLERY_SIZES = "(min-width: 640px) 17vw, 33vw";

/**
 * Guía de razas del mural.
 *
 * Todo lo que se pinta aquí sale de APIs públicas y gratuitas: los datos de
 * cada raza de dogapi.dog y las fotos de dog.ceo. Ninguna de las dos necesita
 * clave.
 *
 * Como el resto de `src/services/breeds`, nada de esto lanza: cada pieza que
 * falle se queda fuera y, si no queda nada que enseñar, la sección entera
 * desaparece en vez de dejar un hueco. Es contenido de adorno, no el historial
 * médico.
 */
export async function BreedShowcase() {
  const [breeds, gallery] = await Promise.all([
    loadFeaturedBreeds(),
    listRandomDogPhotos(GALLERY_SIZE),
  ]);

  if (breeds.length === 0 && gallery.length === 0) return null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow tone="brand">Guía de razas · dogapi.dog y dog.ceo</Eyebrow>
        <h2 className="text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">
          Conoce las razas
        </h2>
        <p className="text-muted-foreground max-w-[60ch] text-sm text-pretty">
          Cuánto vive, cuánto pesa un adulto y para qué se crió cada raza. Son cifras de
          referencia del catálogo público: sirven para saber qué esperar, no para
          diagnosticar nada. Ante cualquier duda, el veterinario.
        </p>
      </div>

      {breeds.length > 0 && (
        <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {breeds.map((breed) => (
            <li key={breed.name} className="flex">
              <BreedCard breed={breed} sizes={CARD_SIZES} />
            </li>
          ))}
        </ul>
      )}

      {gallery.length > 0 && (
        <div className="flex flex-col gap-3">
          <Eyebrow>Galería · fotos de dog.ceo</Eyebrow>
          {/* Decorativas: no aportan información que no esté ya en el texto, así
              que van con `alt` vacío y ocultas al lector de pantalla. */}
          <ul
            className="grid list-none grid-cols-3 gap-2 sm:grid-cols-6"
            aria-hidden="true"
          >
            {gallery.map((url) => (
              <li
                key={url}
                className="border-border bg-muted relative aspect-square overflow-hidden rounded-lg border"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes={GALLERY_SIZES}
                  quality={60}
                  className="object-cover grayscale transition duration-500 hover:grayscale-0"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * Resuelve la guía: ficha y foto de cada raza, en tandas de `PHOTO_BATCH`.
 *
 * Las dos búsquedas comparten catálogo gracias al `cache()` de React que
 * envuelve a `listBreeds` y a `listDogCeoBreeds`, así que las nueve razas
 * cuestan una sola lectura de cada catálogo por muchas tandas que haya.
 *
 * Se descartan las razas de las que no se ha conseguido ni foto ni datos:
 * pintar una tarjeta con sólo el nombre no aporta nada.
 */
async function loadFeaturedBreeds(): Promise<FeaturedBreed[]> {
  const breeds: FeaturedBreed[] = [];

  for (let start = 0; start < FEATURED_BREEDS.length; start += PHOTO_BATCH) {
    const batch = await Promise.all(
      FEATURED_BREEDS.slice(start, start + PHOTO_BATCH).map(async (name) => {
        const [profile, photoUrl] = await Promise.all([
          findBreedByName("dog", name),
          getDogBreedPhoto(name),
        ]);

        // El nombre de respaldo también traducido: si el catálogo no responde
        // pero sí llega la foto, la tarjeta no debe titularse en inglés.
        return {
          name: findBreedText("dog", name)?.name ?? name,
          profile,
          photoUrl,
        } satisfies FeaturedBreed;
      }),
    );

    breeds.push(...batch);
  }

  return breeds.filter((breed) => breed.photoUrl || breed.profile);
}
