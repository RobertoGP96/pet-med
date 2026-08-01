import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { Cake, PawPrint, Pill, Stethoscope } from "lucide-react";

import { SPECIES_LABELS } from "@/domain/enums";
import { getAge, getNextBirthday } from "@/domain/health/age";
import type { PetSummary } from "@/domain/types";
import { formatWeight } from "@/lib/format";

/**
 * Tarjeta del mural.
 *
 * La foto va envuelta en <ViewTransition> con un `name` único por mascota. En
 * la ficha (src/app/mascotas/[petId]/page.tsx) hay otra con el mismo nombre,
 * y eso basta para que React encuentre las dos y anime la foto del mural
 * hasta su posición en la ficha. El `share="morph"` sólo elige la clase CSS
 * con la que se dibuja esa animación.
 */
export function PetMuralCard({
  pet,
  priority,
  breedPhotoUrl,
}: {
  pet: PetSummary;
  priority?: boolean;
  /** Foto genérica de la raza, sólo si la mascota no tiene ninguna propia. */
  breedPhotoUrl?: string | null;
}) {
  const ownPhoto = pet.coverPhotoUrl ?? pet.avatarUrl;
  const photo = ownPhoto ?? breedPhotoUrl ?? null;
  // Se avisa cuando la imagen no es suya: hacerla pasar por su foto sería
  // engañoso, sobre todo en una app donde la gente viene a ver a su mascota.
  const isBreedPhoto = !ownPhoto && Boolean(breedPhotoUrl);

  const age = pet.birthDate ? getAge(pet.birthDate, new Date()) : null;
  const birthday = pet.birthDate ? getNextBirthday(pet.birthDate, new Date()) : null;

  return (
    <Link
      href={`/mascotas/${pet.id}`}
      transitionTypes={["nav-forward"]}
      className="group border-border bg-card focus-visible:ring-brand relative flex flex-col overflow-hidden rounded-2xl border transition hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="bg-brand-muted relative aspect-[4/3] overflow-hidden">
        {photo ? (
          <ViewTransition name={`pet-photo-${pet.id}`} share="morph">
            <Image
              src={photo}
              alt={pet.name}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          </ViewTransition>
        ) : (
          <div className="text-brand/40 grid h-full place-items-center">
            <PawPrint className="size-12" aria-hidden="true" />
          </div>
        )}

        {isBreedPhoto && (
          <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
            Foto de la raza
          </span>
        )}

        {birthday?.isToday && (
          <span className="bg-brand text-brand-foreground absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium shadow">
            <Cake className="size-3.5" aria-hidden="true" />
            ¡Hoy cumple {birthday.turningAge}!
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold tracking-tight">{pet.name}</h3>
          <span className="text-muted-foreground text-xs">
            {SPECIES_LABELS[pet.species]}
            {pet.breed ? ` · ${pet.breed}` : ""}
          </span>
        </div>

        {pet.bio && (
          <p className="text-muted-foreground line-clamp-2 text-sm">{pet.bio}</p>
        )}

        <dl className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs">
          {age && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Edad</dt>
              <Cake className="size-3.5" aria-hidden="true" />
              <dd>
                {age.years > 0
                  ? `${age.years} ${age.years === 1 ? "año" : "años"}`
                  : `${age.totalMonths} meses`}
              </dd>
            </div>
          )}
          {pet.latestWeightKg != null && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Último peso</dt>
              <dd>{formatWeight(pet.latestWeightKg)}</dd>
            </div>
          )}
          {pet.activeConditionsCount > 0 && (
            <div className="text-health-watch flex items-center gap-1.5">
              <dt className="sr-only">Padecimientos activos</dt>
              <Stethoscope className="size-3.5" aria-hidden="true" />
              <dd>{pet.activeConditionsCount}</dd>
            </div>
          )}
          {pet.activeMedicationsCount > 0 && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Tratamientos activos</dt>
              <Pill className="size-3.5" aria-hidden="true" />
              <dd>{pet.activeMedicationsCount}</dd>
            </div>
          )}
        </dl>
      </div>
    </Link>
  );
}
