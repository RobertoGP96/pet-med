import { notFound } from "next/navigation";
import { Suspense } from "react";

import { WeightForm } from "@/components/weights/weight-form";
import { WeightList } from "@/components/weights/weight-list";
import { WeightChart } from "@/components/health/weight-chart";
import { Section } from "@/components/ui/section";
import type { Pet, WeightEntry } from "@/domain/types";
import { getPetWeights } from "@/server/queries";
import { resolveBreedProfile } from "@/services/breeds";

export const metadata = { title: "Peso" };

export default async function PetWeightPage({ params }: PageProps<"/mascotas/[petId]/peso">) {
  const { petId } = await params;
  const result = await getPetWeights(petId);
  if (!result) notFound();

  const weights = result.data;

  return (
    <div className="flex flex-col gap-6">
      {/*
        La gráfica va en su propio Suspense porque el rango de peso de la raza
        sale de una API externa que puede tardar segundos —hasta el corte de 8
        que impone `resolveBreedProfile`—. Sin esta frontera, el historial y el
        formulario, que ya están listos, esperarían a dogapi.dog para pintarse.
      */}
      <Suspense fallback={<ChartSkeleton />}>
        <WeightChartSection pet={result.pet} weights={weights} />
      </Suspense>

      <Section
        title="Registrar peso"
        description="Anótalo cada pocas semanas: la tendencia avisa antes que un valor suelto."
      >
        <WeightForm petId={petId} />
      </Section>

      <Section title="Historial">
        <WeightList weights={weights} petId={petId} />
      </Section>
    </div>
  );
}

/** La gráfica con el rango de la raza de fondo, si la API lo da a tiempo. */
async function WeightChartSection({ pet, weights }: { pet: Pet; weights: WeightEntry[] }) {
  const breed = await resolveBreedProfile(pet.species, pet.breedRefId, pet.breed);

  return (
    <Section title="Evolución">
      <WeightChart entries={weights} breedRange={breed?.weightRange ?? null} />
    </Section>
  );
}

function ChartSkeleton() {
  return (
    <Section title="Evolución">
      <div className="bg-muted h-56 w-full animate-pulse rounded" aria-hidden="true" />
    </Section>
  );
}
