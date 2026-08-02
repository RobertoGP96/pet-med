import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { ArrowLeft, Cake, PawPrint, Star } from "lucide-react";

import { Eyebrow } from "@/components/ui/section";
import { SEX_LABELS, SPECIES_LABELS } from "@/domain/enums";
import { getAge, getNextBirthday } from "@/domain/health/age";
import { isSupabaseConfigured } from "@/lib/env";
import { getMuralPet } from "@/server/queries";

/**
 * Ficha pública de una mascota del mural.
 *
 * Es la contraparte de /mascotas/[petId]: enseña lo que cualquiera puede ver
 * —nombre, especie, raza, edad, descripción y fotos— y ni una línea del
 * historial médico. La ficha con peso, padecimientos, medicación e historia
 * clínica sigue en /mascotas/[petId] y sólo la abre su dueño.
 *
 * No hace falta comprobar permisos a mano: `getMuralPet` entra con el cliente
 * de sesión y la política `pets_public_select` sólo devuelve las mascotas
 * públicas y no ocultadas. Una mascota privada devuelve null y aquí se
 * convierte en un 404.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/mural/[petId]">) {
  const result = await getMuralPet((await params).petId);
  if (!result) return { title: "Mascota" };

  return {
    title: result.pet.name,
    description: result.pet.bio ?? `${result.pet.name} en el mural de Pet Med.`,
  };
}

export default async function MuralPetPage({ params }: PageProps<"/mural/[petId]">) {
  if (!isSupabaseConfigured()) notFound();

  const { petId } = await params;
  const result = await getMuralPet(petId);
  if (!result) notFound();

  const { pet, photos } = result;
  const now = new Date();
  const age = pet.birth_date ? getAge(pet.birth_date, now) : null;
  const birthday = pet.birth_date ? getNextBirthday(pet.birth_date, now) : null;

  const cover = photos.find((photo) => photo.isCover) ?? photos[0] ?? null;
  const coverUrl = cover?.url ?? pet.avatar_url;
  const rest = photos.filter((photo) => photo.id !== cover?.id);

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/"
        transitionTypes={["nav-back"]}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm transition"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver al mural
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* La foto lleva el mismo `name` de transición que la tarjeta de la
            cinta, así que al llegar desde el mural se transforma en esta. */}
        <ViewTransition name={`pet-photo-${pet.id}`} share="morph">
          <div className="bg-muted border-border relative aspect-square overflow-hidden rounded-lg border">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={pet.name}
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="text-muted-foreground/40 grid h-full place-items-center">
                <PawPrint className="size-20" aria-hidden="true" />
              </div>
            )}
          </div>
        </ViewTransition>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow tone="brand">En el mural</Eyebrow>
            {pet.featured && (
              <span className="eyebrow bg-primary text-primary-foreground flex items-center gap-1.5 rounded px-2 py-1">
                <Star className="size-3" aria-hidden="true" />
                Destacada
              </span>
            )}
          </div>

          <h1 className="text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">{pet.name}</h1>

          {pet.bio && <p className="max-w-[60ch] text-pretty">{pet.bio}</p>}

          <dl className="bg-border border-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-3">
            <Fact label="Especie" value={SPECIES_LABELS[pet.species]} />
            {pet.breed && <Fact label="Raza" value={pet.breed} />}
            <Fact label="Sexo" value={SEX_LABELS[pet.sex]} />
            {age && (
              <Fact
                label="Edad"
                value={
                  age.years > 0
                    ? `${age.years} ${age.years === 1 ? "año" : "años"}`
                    : `${age.totalMonths} meses`
                }
              />
            )}
            {pet.color && <Fact label="Color" value={pet.color} />}
            {birthday && (
              <Fact
                label="Cumpleaños"
                value={
                  birthday.isToday
                    ? "¡Hoy!"
                    : `en ${birthday.daysUntil} ${birthday.daysUntil === 1 ? "día" : "días"}`
                }
              />
            )}
          </dl>

          {birthday?.isToday && (
            <p className="border-brand bg-brand-muted text-brand flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-extrabold">
              <Cake className="size-4 shrink-0" aria-hidden="true" />
              Hoy cumple {birthday.turningAge}.
            </p>
          )}
        </div>
      </div>

      {rest.length > 0 && (
        <section className="flex flex-col gap-3">
          <Eyebrow>Galería · {photos.length} fotos</Eyebrow>
          <ul className="grid list-none grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rest.map((photo) => (
              <li
                key={photo.id}
                className="border-border bg-muted relative aspect-square overflow-hidden rounded-lg border"
              >
                <Image
                  src={photo.url}
                  alt={photo.caption ?? pet.name}
                  fill
                  sizes="(min-width: 1024px) 22vw, 45vw"
                  className="object-cover transition duration-500 hover:scale-105"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card flex flex-col gap-1 px-4 py-3">
      <dt>
        <Eyebrow>{label}</Eyebrow>
      </dt>
      <dd className="font-extrabold tracking-[-0.02em]">{value}</dd>
    </div>
  );
}
