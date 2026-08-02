import { Suspense, ViewTransition } from "react";
import { PawPrint, Plus } from "lucide-react";

import { BreedShowcase } from "@/components/breeds/breed-showcase";
import { DogFact } from "@/components/pets/dog-fact";
import { MuralHero } from "@/components/pets/mural-hero";
import { PetMuralGrid } from "@/components/pets/pet-mural-grid";
import { SetupNotice } from "@/components/setup-notice";
import { ActionLink } from "@/components/ui/action";
import { EmptyState } from "@/components/ui/section";
import { getSessionUser } from "@/lib/auth";
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

export default async function MuralPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const user = await getSessionUser();

  return (
    <div className="flex flex-col gap-14">
      <MuralHero signedIn={Boolean(user)} />

      {/* Suspense propio: una curiosidad no debe retrasar el mural. */}
      <Suspense fallback={null}>
        <DogFact />
      </Suspense>

      {/* El esqueleto sale por `exit` y la rejilla entra por `enter`, así el
          contenido no aparece de golpe cuando termina la consulta. */}
      <Suspense
        fallback={
          <ViewTransition exit="slide-down">
            <MuralSkeleton />
          </ViewTransition>
        }
      >
        <ViewTransition enter="slide-up" default="none">
          <MuralBoard signedIn={Boolean(user)} />
        </ViewTransition>
      </Suspense>

      {/* La guía de razas depende de dos APIs externas, así que va en su propio
          Suspense: si tardan, el mural ya está pintado. Y si fallan,
          <BreedShowcase> no devuelve nada y aquí no queda hueco. */}
      <Suspense fallback={null}>
        <BreedShowcase />
      </Suspense>
    </div>
  );
}

async function MuralBoard({ signedIn }: { signedIn: boolean }) {
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
        description="Las mascotas aparecen aquí con su foto de portada y su descripción, salvo que su dueño prefiera lo contrario."
        action={
          signedIn ? (
            <ActionLink href="/mascotas/nueva">
              <Plus className="size-4" />
              Añadir la primera
            </ActionLink>
          ) : (
            <ActionLink href="/registro">
              <Plus className="size-4" />
              Crear una cuenta
            </ActionLink>
          )
        }
      />
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">En la casa</h2>
        <p className="text-muted-foreground text-xs">
          Toca cualquier mascota para abrir su ficha pública.
        </p>
      </div>

      <PetMuralGrid pets={pets} breedPhotos={breedPhotos} />
    </section>
  );
}

/** Mismo ritmo de celdas que <PetMuralGrid>, para que el relevo no dé un salto. */
const SKELETON_SPANS = [
  "lg:col-span-4",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-4",
];

function MuralSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <div className="bg-muted h-6 w-32 animate-pulse rounded" />
        <div className="bg-muted h-3 w-56 animate-pulse rounded" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {SKELETON_SPANS.map((span, index) => (
          <div
            key={index}
            className={`border-border bg-card flex flex-col overflow-hidden rounded-lg border ${span}`}
          >
            <div className="bg-muted h-56 animate-pulse sm:h-64 lg:h-80" />
            <div className="flex flex-col gap-2 p-5 sm:p-6">
              <div className="bg-muted h-5 w-1/2 animate-pulse rounded" />
              <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
