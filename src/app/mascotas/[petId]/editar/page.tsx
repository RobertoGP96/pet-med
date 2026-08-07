import { notFound } from "next/navigation";

import { DeletePetSection } from "@/components/pets/delete-pet-section";
import { PetForm, type BreedOption } from "@/components/pets/pet-form";
import { getPet, listParentCandidates } from "@/server/queries";
import { listBreeds } from "@/services/breeds";

export const metadata = { title: "Editar ficha" };

export default async function EditPetPage({ params }: PageProps<"/mascotas/[petId]/editar">) {
  const { petId } = await params;
  const pet = await getPet(petId);
  if (!pet) notFound();

  const [dogs, cats, parentCandidates] = await Promise.all([
    listBreeds("dog"),
    listBreeds("cat"),
    listParentCandidates(),
  ]);
  const breeds: BreedOption[] = [...dogs, ...cats].map((breed) => ({
    id: breed.id,
    name: breed.name,
    species: breed.species,
  }));

  return (
    <div className="flex flex-col gap-8">
      <PetForm pet={pet} breeds={breeds} parentCandidates={parentCandidates} />
      <DeletePetSection petId={pet.id} petName={pet.name} />
    </div>
  );
}
