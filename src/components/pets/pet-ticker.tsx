import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PetMuralCard } from "@/components/pets/pet-mural-card";
import type { MuralPet } from "@/domain/types";

/** Ancho de tarjeta (300px) más su separación (16px). Ver PetMuralCard. */
const CARD_PITCH = 316;
/** Pista mínima para que no se vea el hueco en pantallas anchas. */
const MIN_TRACK_PX = 1900;

/**
 * Cinta infinita del mural.
 *
 * El bucle es puro CSS: la pista se compone de dos mitades idénticas y la
 * animación la desplaza justo un 50 %, de modo que al terminar la segunda
 * mitad queda exactamente donde arrancó la primera y el salto no se ve. Por eso
 * la separación entre tarjetas va como margen de cada tarjeta y no como `gap`:
 * con `gap` faltaría media separación en la costura y la cinta daría un tirón
 * en cada vuelta.
 *
 * Con pocas mascotas dos mitades no llenan la pantalla, así que la lista base
 * se repite las veces necesarias antes de duplicarse.
 */
export function PetTicker({
  pets,
  breedPhotos,
}: {
  pets: MuralPet[];
  /** Foto de raza por mascota, en el mismo orden que `pets`. */
  breedPhotos: (string | null)[];
}) {
  const copies = Math.max(1, Math.ceil(MIN_TRACK_PX / (pets.length * CARD_PITCH)));
  const half = Array.from({ length: copies }, () => pets).flat();
  const track = [...half, ...half];

  return (
    // El movimiento se detiene al pasar el cursor o al llegar con el tabulador;
    // de eso se encarga la clase `ticker-track` en globals.css.
    <div className="relative [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
      <ul className="ticker-track flex list-none">
        {track.map((pet, index) => (
          <li key={index} className="mr-4">
            <PetMuralCard
              pet={pet}
              breedPhotoUrl={breedPhotos[index % pets.length]}
              priority={index < 3}
              duplicate={index >= pets.length}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Índice de nombres bajo la cinta.
 *
 * La cinta se mueve y hay que cazarla; esto es la misma lista quieta y en
 * orden, que además es el camino accesible a cada ficha.
 */
export function PetIndex({ pets }: { pets: MuralPet[] }) {
  return (
    <ul className="bg-border border-border grid list-none grid-cols-1 gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-3">
      {pets.map((pet) => (
        <li key={pet.id}>
          {/* A /mural y no a /mascotas: desde el mural se llega a la ficha
              pública, que es la que puede abrir cualquiera. La ficha con el
              historial vive en /mascotas y sólo la ve su dueño. */}
          <Link
            href={`/mural/${pet.id}`}
            transitionTypes={["nav-forward"]}
            className="bg-card hover:bg-primary hover:text-primary-foreground focus-visible:ring-brand group flex items-center gap-3 px-4 py-3.5 font-extrabold transition focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="truncate">{pet.name}</span>
            <ArrowRight
              className="text-brand ml-auto size-4 shrink-0 transition group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
