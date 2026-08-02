import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { Cake, PawPrint, Star } from "lucide-react";

import { SPECIES_LABELS } from "@/domain/enums";
import { getAge, getNextBirthday } from "@/domain/health/age";
import type { MuralPet } from "@/domain/types";

/**
 * Tarjeta del mural, la pieza que viaja en la cinta.
 *
 * Ancho fijo: es un vagón de una cinta horizontal, no una celda de una rejilla
 * que deba estirarse. La foto va en blanco y negro y recupera el color al pasar
 * el cursor — el diseño usa la escala de grises para que la fila se lea como un
 * archivo y sea la mascota mirada la que se enciende.
 *
 * La foto va envuelta en <ViewTransition> con un `name` único por mascota. En
 * la ficha pública (src/app/mural/[petId]/page.tsx) hay otra con el mismo
 * nombre, y eso basta para que React encuentre las dos y anime la foto del
 * mural hasta su posición en la ficha. El `share="morph"` sólo elige la clase
 * CSS con la que se dibuja esa animación.
 */
export function PetMuralCard({
  pet,
  priority,
  breedPhotoUrl,
  /**
   * La cinta duplica la lista para que el bucle no salte. La copia es puro
   * adorno: se oculta a los lectores de pantalla y no repite el `name` de la
   * transición, que debe ser único en la página.
   */
  duplicate = false,
}: {
  pet: MuralPet;
  priority?: boolean;
  /** Foto genérica de la raza, sólo si la mascota no tiene ninguna propia. */
  breedPhotoUrl?: string | null;
  duplicate?: boolean;
}) {
  const ownPhoto = pet.coverPhotoUrl ?? pet.avatarUrl;
  const photo = ownPhoto ?? breedPhotoUrl ?? null;
  // Se avisa cuando la imagen no es suya: hacerla pasar por su foto sería
  // engañoso, sobre todo en una app donde la gente viene a ver a su mascota.
  const isBreedPhoto = !ownPhoto && Boolean(breedPhotoUrl);

  const age = pet.birthDate ? getAge(pet.birthDate, new Date()) : null;
  const birthday = pet.birthDate ? getNextBirthday(pet.birthDate, new Date()) : null;

  const cover = photo ? (
    <Image
      src={photo}
      alt={pet.name}
      fill
      priority={priority}
      sizes="300px"
      className="object-cover grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
    />
  ) : (
    <div className="text-muted-foreground/40 grid h-full place-items-center">
      <PawPrint className="size-12" aria-hidden="true" />
    </div>
  );

  return (
    <Link
      href={`/mural/${pet.id}`}
      transitionTypes={["nav-forward"]}
      tabIndex={duplicate ? -1 : undefined}
      aria-hidden={duplicate || undefined}
      className="group border-border bg-card hover:border-brand focus-visible:ring-brand relative flex w-[300px] shrink-0 flex-col overflow-hidden rounded-lg border transition focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="bg-muted relative aspect-[4/3] overflow-hidden">
        {duplicate ? (
          cover
        ) : (
          <ViewTransition name={`pet-photo-${pet.id}`} share="morph">
            {cover}
          </ViewTransition>
        )}

        {isBreedPhoto && (
          <span className="eyebrow bg-primary/70 text-primary-foreground absolute right-2 bottom-2 rounded px-2 py-1 backdrop-blur">
            Foto de la raza
          </span>
        )}

        {birthday?.isToday && (
          <span className="eyebrow bg-brand text-brand-foreground absolute top-3 left-3 flex items-center gap-1.5 rounded px-2.5 py-1">
            <Cake className="size-3.5" aria-hidden="true" />
            Hoy cumple {birthday.turningAge}
          </span>
        )}

        {/* Sólo cuando no hay cumpleaños: dos rótulos en la misma esquina se
            pisarían, y el cumpleaños manda. */}
        {pet.featured && !birthday?.isToday && (
          <span className="eyebrow bg-primary text-primary-foreground absolute top-3 left-3 flex items-center gap-1.5 rounded px-2.5 py-1">
            <Star className="size-3.5" aria-hidden="true" />
            Destacada
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-baseline gap-2">
          <h3 className="truncate text-xl font-extrabold tracking-[-0.02em]">{pet.name}</h3>
          {age && (
            <span className="text-muted-foreground shrink-0 text-xs">
              {age.years > 0
                ? `${age.years} ${age.years === 1 ? "año" : "años"}`
                : `${age.totalMonths} meses`}
            </span>
          )}
        </div>

        <p className="text-muted-foreground truncate text-xs">
          {SPECIES_LABELS[pet.species]}
          {pet.breed ? ` · ${pet.breed}` : ""}
        </p>

        {/* La descripción que escribió su dueño. Es lo único que el mural
            cuenta de cada mascota además de su foto: peso, padecimientos y
            medicación se quedan en la ficha privada. */}
        {pet.bio && (
          <p className="text-muted-foreground mt-auto line-clamp-2 pt-1 text-xs text-pretty">
            {pet.bio}
          </p>
        )}
      </div>
    </Link>
  );
}
