import Link from "next/link";
import { PawPrint, Plus } from "lucide-react";

import { PetAvatar } from "@/components/pets/pet-avatar";
import { SetupNotice } from "@/components/setup-notice";
import { ActionLink } from "@/components/ui/action";
import { EmptyState, PageHeader } from "@/components/ui/section";
import { SPECIES_LABELS } from "@/domain/enums";
import { getAge } from "@/domain/health/age";
import { formatWeight } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/env";
import { listPets } from "@/server/queries";
import { toDisplayBreedName } from "@/services/breeds/i18n/breeds";

export const metadata = {
  title: "Mis mascotas",
};

/** Datos siempre frescos: ver la nota en src/app/page.tsx. */
export const dynamic = "force-dynamic";

export default async function PetsPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const pets = await listPets();
  const now = new Date();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Mis mascotas"
        description="Todas las fichas, incluidas las que no salen en el mural."
        action={
          <ActionLink href="/mascotas/nueva">
            <Plus className="size-4" />
            Añadir mascota
          </ActionLink>
        }
      />

      {pets.length === 0 ? (
        <EmptyState
          icon={<PawPrint className="size-10" />}
          title="Todavía no hay ninguna ficha"
          description="Crea la primera para empezar a registrar peso, tratamientos y visitas al veterinario."
          action={
            <ActionLink href="/mascotas/nueva">
              <Plus className="size-4" />
              Crear ficha
            </ActionLink>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {pets.map((pet) => {
            const age = pet.birthDate ? getAge(pet.birthDate, now) : null;

            return (
              <li key={pet.id}>
                <Link
                  href={`/mascotas/${pet.id}`}
                  transitionTypes={["nav-forward"]}
                  // `group` es lo que despierta al avatar: la foto está en
                  // escala de grises y recupera el color al pasar el cursor
                  // por la fila entera, no sólo por la miniatura.
                  className="group border-border bg-card hover:border-brand focus-visible:ring-brand flex items-center gap-4 rounded-lg border p-4 transition focus-visible:ring-2 focus-visible:outline-none"
                >
                  <PetAvatar
                    name={pet.name}
                    species={pet.species}
                    url={pet.coverPhotoUrl ?? pet.avatarUrl}
                    size={52}
                  />

                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate font-extrabold tracking-[-0.02em]">{pet.name}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {SPECIES_LABELS[pet.species]}
                      {pet.breed ? ` · ${toDisplayBreedName(pet.species, pet.breed)}` : ""}
                      {age ? ` · ${age.years > 0 ? `${age.years} a` : `${age.totalMonths} m`}` : ""}
                    </p>
                  </div>

                  <div className="text-muted-foreground hidden shrink-0 flex-col items-end gap-0.5 text-xs sm:flex">
                    {pet.latestWeightKg != null && <span>{formatWeight(pet.latestWeightKg)}</span>}
                    {pet.activeMedicationsCount > 0 && (
                      <span>{pet.activeMedicationsCount} en tratamiento</span>
                    )}
                    {!pet.isPublic && <span className="italic">No sale en el mural</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
