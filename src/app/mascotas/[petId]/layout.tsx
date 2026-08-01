import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { ArrowLeft, PawPrint, Pencil } from "lucide-react";

import { PetTabs } from "@/components/pets/pet-tabs";
import { SPECIES_LABELS, SEX_LABELS } from "@/domain/enums";
import { getAge, getLifeStage } from "@/domain/health/age";
import { LIFE_STAGE_LABELS } from "@/domain/enums";
import { getPet } from "@/server/queries";

/**
 * Armazón de la ficha: cabecera con la foto y las pestañas.
 *
 * Al vivir en el layout, la cabecera no se vuelve a montar al cambiar de
 * pestaña — sólo se sustituye el contenido de debajo.
 */
export default async function PetLayout({
  children,
  params,
}: LayoutProps<"/mascotas/[petId]">) {
  // En Next 16 los `params` son una promesa: el acceso síncrono se eliminó.
  const { petId } = await params;
  const pet = await getPet(petId);

  if (!pet) notFound();

  const age = pet.birthDate ? getAge(pet.birthDate, new Date()) : null;
  const stage = age ? getLifeStage(pet.species, age.totalMonths, pet.size) : null;
  const photo = pet.avatarUrl;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/mascotas"
        transitionTypes={["nav-back"]}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition"
      >
        <ArrowLeft className="size-4" />
        Mis mascotas
      </Link>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* Mismo `name` que en la tarjeta del mural: React empareja las dos
            fotos y anima una hasta la otra durante la navegación. */}
        <ViewTransition name={`pet-photo-${pet.id}`} share="morph">
          <div className="bg-brand-muted relative size-24 shrink-0 overflow-hidden rounded-2xl">
            {photo ? (
              <Image src={photo} alt={pet.name} fill sizes="96px" className="object-cover" />
            ) : (
              <div className="text-brand/40 grid h-full place-items-center">
                <PawPrint className="size-8" aria-hidden="true" />
              </div>
            )}
          </div>
        </ViewTransition>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{pet.name}</h1>
          <p className="text-muted-foreground text-sm">
            {[
              SPECIES_LABELS[pet.species],
              pet.breed,
              SEX_LABELS[pet.sex] !== "Sin definir" ? SEX_LABELS[pet.sex] : null,
              stage ? LIFE_STAGE_LABELS[stage] : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {pet.bio && <p className="text-muted-foreground mt-1 text-sm">{pet.bio}</p>}
        </div>

        <Link
          href={`/mascotas/${pet.id}/editar`}
          className="border-border hover:bg-muted inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-md border px-3 text-sm transition"
        >
          <Pencil className="size-4" />
          Editar
        </Link>
      </header>

      <PetTabs petId={pet.id} />

      {children}
    </div>
  );
}
