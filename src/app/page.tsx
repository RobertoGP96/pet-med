import { Suspense, ViewTransition } from "react";
import { PawPrint, Plus } from "lucide-react";

import { DogFact } from "@/components/pets/dog-fact";
import { MuralHero, MuralStats } from "@/components/pets/mural-hero";
import { PetIndex, PetTicker } from "@/components/pets/pet-ticker";
import { SetupNotice } from "@/components/setup-notice";
import { ActionLink } from "@/components/ui/action";
import { EmptyState, Eyebrow } from "@/components/ui/section";
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
    <div className="flex flex-col gap-10">
      <MuralHero signedIn={Boolean(user)} />

      {/* Suspense propio: una curiosidad no debe retrasar el mural. */}
      <Suspense fallback={null}>
        <DogFact />
      </Suspense>

      {/* El esqueleto sale por `exit` y la cinta entra por `enter`, así el
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
    <div className="flex flex-col gap-10">
      <MuralStats pets={pets} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-extrabold tracking-[-0.02em]">En la casa</h2>
          <p className="text-muted-foreground text-xs">
            Pasa el cursor sobre la cinta para detenerla.
          </p>
        </div>

        {/* La cinta se sale de la caja de contenido: cancela el margen del
            armazón para llegar a los bordes y leerse como una tira continua. */}
        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <PetTicker pets={pets} breedPhotos={breedPhotos} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow>Índice · {pets.length} fichas</Eyebrow>
        <PetIndex pets={pets} />
      </section>
    </div>
  );
}

function MuralSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-hidden="true">
      <div className="bg-border border-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-card flex flex-col gap-2 px-4 py-4">
            <div className="bg-muted h-8 w-12 animate-pulse rounded" />
            <div className="bg-muted h-3 w-24 animate-pulse rounded" />
          </div>
        ))}
      </div>

      <div className="-mx-4 flex overflow-hidden sm:-mx-6 lg:-mx-8">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="border-border bg-card mr-4 w-[300px] shrink-0 overflow-hidden rounded-lg border"
          >
            <div className="bg-muted aspect-[4/3] animate-pulse" />
            <div className="flex flex-col gap-2 p-4">
              <div className="bg-muted h-5 w-1/2 animate-pulse rounded" />
              <div className="bg-muted h-3 w-3/4 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
