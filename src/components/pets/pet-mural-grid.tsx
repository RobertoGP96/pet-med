import { PetMuralCard } from "@/components/pets/pet-mural-card";
import type { MuralPet } from "@/domain/types";

/**
 * Rejilla del mural, al estilo «bento».
 *
 * Sustituye a la cinta infinita que había antes: el movimiento obligaba a
 * cazar las tarjetas al vuelo y duplicaba la lista en el marcado para que el
 * bucle no saltara. Aquí cada mascota sale una sola vez, quieta y navegable
 * con el tabulador.
 *
 * El ritmo es el del bento clásico: seis columnas y un patrón de cuatro celdas
 * —ancha, estrecha, estrecha, ancha— que llena cada par de filas exactamente
 * (4 + 2 y 2 + 4). Al alternar el lado ancho en filas consecutivas la página no
 * se lee como una cuadrícula regular, y como el patrón tesela siempre, no
 * quedan huecos interiores por muchas mascotas que haya.
 *
 * Debajo de `lg` no hay bento: dos columnas en tableta y una en móvil, que es
 * donde una celda de dos sextos sería una rendija.
 */
const SPANS = ["lg:col-span-4", "lg:col-span-2", "lg:col-span-2", "lg:col-span-4"];

/** Celdas anchas del patrón: las que llevan el nombre a mayor cuerpo. */
const WIDE_SLOTS = new Set([0, 3]);

/**
 * `sizes` de cada celda para que `next/image` no descargue una foto de más.
 * En móvil todas ocupan el ancho completo.
 */
const SIZES_WIDE = "(min-width: 1024px) 66vw, (min-width: 640px) 50vw, 100vw";
const SIZES_NARROW = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export function PetMuralGrid({
  pets,
  breedPhotos,
}: {
  pets: MuralPet[];
  /** Foto de raza por mascota, en el mismo orden que `pets`. */
  breedPhotos: (string | null)[];
}) {
  return (
    <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {pets.map((pet, index) => {
        const slot = index % SPANS.length;
        const wide = WIDE_SLOTS.has(slot);

        return (
          <li key={pet.id} className={`flex ${SPANS[slot]}`}>
            <PetMuralCard
              pet={pet}
              breedPhotoUrl={breedPhotos[index]}
              // Las tres primeras entran en la primera pantalla: se cargan sin
              // esperar al observador de recorte.
              priority={index < 3}
              prominent={wide}
              sizes={wide ? SIZES_WIDE : SIZES_NARROW}
            />
          </li>
        );
      })}
    </ul>
  );
}
