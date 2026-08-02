import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { Cake, PawPrint, Star } from "lucide-react";

import { SPECIES_LABELS } from "@/domain/enums";
import { getAge, getNextBirthday } from "@/domain/health/age";
import type { MuralPet } from "@/domain/types";
import { cn } from "@/lib/utils";

/**
 * Celda del mural.
 *
 * Ocupa todo el ancho de la celda que le toque en la rejilla (ver
 * pet-mural-grid.tsx) y reparte el alto como el bento del que viene: la foto a
 * una altura fija arriba y el texto debajo, en su bloque con aire. Así las
 * celdas anchas y las estrechas de una misma fila acaban a la misma altura sin
 * estirar la foto.
 *
 * El texto va debajo y no encima de la imagen a propósito: escribirlo encima
 * obligaría a un velo oscuro y a texto claro fijo, y eso se rompe en cuanto la
 * interfaz cambia a modo oscuro.
 *
 * La foto va en blanco y negro y recupera el color al pasar el cursor: el
 * diseño usa la escala de grises para que el mural se lea como un archivo y
 * sea la mascota mirada la que se enciende.
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
   * Celda grande: hay sitio para la descripción y el nombre va a mayor cuerpo.
   * Lo decide la rejilla, que es quien sabe qué tamaño le ha dado.
   */
  prominent = false,
  className,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
}: {
  pet: MuralPet;
  priority?: boolean;
  /** Foto genérica de la raza, sólo si la mascota no tiene ninguna propia. */
  breedPhotoUrl?: string | null;
  prominent?: boolean;
  className?: string;
  sizes?: string;
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
      sizes={sizes}
      className="object-cover grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
    />
  ) : (
    // Sin foto la celda no se queda en blanco: la trama de huellas del diseño
    // la rellena y la huella grande marca que falta la imagen.
    <div className="paws text-muted-foreground/40 grid h-full place-items-center">
      <PawPrint className="size-12" aria-hidden="true" />
    </div>
  );

  return (
    <Link
      href={`/mural/${pet.id}`}
      transitionTypes={["nav-forward"]}
      className={cn(
        "group border-border bg-card hover:border-brand focus-visible:ring-brand flex w-full flex-col overflow-hidden rounded-lg border transition focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      {/* Altura fija, como en el bento de referencia: es lo que alinea las
          tarjetas de una fila aunque sus textos midan distinto. */}
      <div className="bg-muted relative h-56 shrink-0 overflow-hidden sm:h-64 lg:h-80">
        <ViewTransition name={`pet-photo-${pet.id}`} share="morph">
          {cover}
        </ViewTransition>

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

      <div className="flex flex-1 flex-col gap-1 p-5 sm:p-6">
        <div className="flex items-baseline gap-2">
          <h3
            className={cn(
              "truncate font-extrabold tracking-[-0.02em]",
              prominent ? "text-2xl" : "text-lg",
            )}
          >
            {pet.name}
          </h3>
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
            medicación se quedan en la ficha privada. Sólo cabe en las celdas
            grandes; en las pequeñas le robaría el sitio a la foto. */}
        {prominent && pet.bio && (
          <p className="text-muted-foreground mt-1 line-clamp-2 max-w-[60ch] text-xs text-pretty">
            {pet.bio}
          </p>
        )}
      </div>
    </Link>
  );
}
