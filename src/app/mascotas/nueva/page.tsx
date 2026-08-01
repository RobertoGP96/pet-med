import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PetForm, type BreedOption } from "@/components/pets/pet-form";
import { SetupNotice } from "@/components/setup-notice";
import { PageHeader } from "@/components/ui/section";
import { isSupabaseConfigured } from "@/lib/env";
import { listBreeds } from "@/services/breeds";

export const metadata = {
  title: "Nueva mascota",
};

export default async function NewPetPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  // Si las APIs de razas no responden, `listBreeds` devuelve [] y el
  // formulario simplemente se queda sin sugerencias.
  const [dogs, cats] = await Promise.all([listBreeds("dog"), listBreeds("cat")]);

  const breeds: BreedOption[] = [...dogs, ...cats].map((breed) => ({
    id: breed.id,
    name: breed.name,
    species: breed.species,
  }));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Nueva mascota"
        description="Sólo el nombre y la especie son obligatorios; el resto se puede completar más adelante."
        eyebrow={
          <Link
            href="/mascotas"
            transitionTypes={["nav-back"]}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition"
          >
            <ArrowLeft className="size-4" />
            Mis mascotas
          </Link>
        }
      />

      <PetForm breeds={breeds} />
    </div>
  );
}
