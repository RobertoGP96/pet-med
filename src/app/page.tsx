import Link from "next/link";
import { Suspense, ViewTransition } from "react";
import { PawPrint, Plus } from "lucide-react";

import { DogFact } from "@/components/pets/dog-fact";
import { PetMuralCard } from "@/components/pets/pet-mural-card";
import { SetupNotice } from "@/components/setup-notice";
import { EmptyState } from "@/components/ui/section";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { isSupabaseConfigured } from "@/lib/env";
import { listMuralPets } from "@/server/queries";
import { getDogBreedPhoto } from "@/services/breeds/photos";

export const metadata = {
  title: "Mural",
  description: "Las mascotas de la casa, sus fotos y sus historias.",
};

/**
 * Render dinámico en cada visita.
 *
 * Sin esto Next prerenderiza la página en el build: las mutaciones de la app
 * la refrescarían (las acciones llaman a `revalidatePath`), pero cualquier
 * cambio hecho fuera —el SQL Editor de Supabase, el seed, otro dispositivo—
 * no se vería nunca. Para un historial médico personal, mostrar datos frescos
 * pesa más que ahorrarse la consulta.
 */
export const dynamic = "force-dynamic";

export default function MuralPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">El mural</h1>
        <TextGenerateEffect
          words="Las mascotas de la casa, sus fotos y todo lo que hay que saber de su salud."
          className="text-muted-foreground max-w-2xl text-base font-normal"
        />
      </header>

      {/* Suspense propio: una curiosidad no debe retrasar el mural. */}
      <Suspense fallback={null}>
        <DogFact />
      </Suspense>

      {/* El esqueleto sale por `exit` y la parrilla entra por `enter`, así el
          contenido no aparece de golpe cuando termina la consulta. */}
      <Suspense
        fallback={
          <ViewTransition exit="slide-down">
            <MuralSkeleton />
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <MuralGrid />
        </ViewTransition>
      </Suspense>
    </div>
  );
}

async function MuralGrid() {
  const pets = await listMuralPets();

  // Para las mascotas sin foto propia se busca una de su raza en dog.ceo, en
  // lugar de dejar el hueco con el icono. Se resuelven en paralelo y un fallo
  // individual sólo significa que esa tarjeta se queda sin imagen.
  const breedPhotos = await Promise.all(
    pets.map((pet) =>
      pet.coverPhotoUrl || pet.avatarUrl || pet.species !== "dog"
        ? Promise.resolve(null)
        : getDogBreedPhoto(pet.breed),
    ),
  );

  if (pets.length === 0) {
    return (
      <EmptyState
        icon={<PawPrint className="size-10" />}
        title="El mural está vacío"
        description="Las mascotas marcadas como públicas aparecen aquí con su foto de portada y su descripción."
        action={
          <Link
            href="/mascotas/nueva"
            className="bg-brand text-brand-foreground inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium transition hover:opacity-90"
          >
            <Plus className="size-4" />
            Añadir la primera
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {pets.map((pet, index) => (
        // Las tres primeras cargan con prioridad: son las que entran en
        // pantalla y marcan el LCP.
        <PetMuralCard
          key={pet.id}
          pet={pet}
          priority={index < 3}
          breedPhotoUrl={breedPhotos[index]}
        />
      ))}
    </div>
  );
}

function MuralSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="border-border bg-card overflow-hidden rounded-2xl border"
          aria-hidden="true"
        >
          <div className="bg-muted aspect-[4/3] animate-pulse" />
          <div className="flex flex-col gap-2 p-4">
            <div className="bg-muted h-5 w-1/2 animate-pulse rounded" />
            <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
