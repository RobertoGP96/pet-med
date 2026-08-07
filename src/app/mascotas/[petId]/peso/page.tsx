import { notFound } from "next/navigation";
import { Suspense } from "react";

import { WeightForm } from "@/components/weights/weight-form";
import { WeightList } from "@/components/weights/weight-list";
import { WeightStatusCard } from "@/components/weights/weight-status-card";
import { WeightChart } from "@/components/health/weight-chart";
import { Section } from "@/components/ui/section";
import { getWeightRangeForSex } from "@/domain/breed";
import { assessWeightStatus } from "@/domain/health/weight";
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

/**
 * El veredicto de estado y la gráfica, con el rango de la raza si la API lo
 * da a tiempo. Van juntos en el mismo Suspense porque ambos dependen del
 * perfil de raza; si la API falla, se pintan igual sólo con BCS y tendencia.
 */
async function WeightChartSection({ pet, weights }: { pet: Pet; weights: WeightEntry[] }) {
  const breed = await resolveBreedProfile(pet.species, pet.breedRefId, pet.breed);
  // El mismo rango (por sexo cuando la fuente lo publica) alimenta el
  // veredicto y la banda de la gráfica, para que no se contradigan.
  const breedRange = getWeightRangeForSex(breed, pet.sex);
  const status = assessWeightStatus(weights, breedRange, new Date());

  return (
    <>
      {status && (
        <Section
          title="Estado"
          description="Clasificación a partir de la condición corporal, el rango de su raza y la tendencia."
        >
          <WeightStatusCard status={status} />
        </Section>
      )}

      <Section title="Evolución">
        <WeightChart entries={weights} breedRange={breedRange} latestLevel={status?.level} />
      </Section>
    </>
  );
}

function ChartSkeleton() {
  return (
    <>
      <Section title="Estado">
        <div className="bg-muted h-24 w-full animate-pulse rounded" aria-hidden="true" />
      </Section>
      <Section title="Evolución">
        <div className="bg-muted h-56 w-full animate-pulse rounded" aria-hidden="true" />
      </Section>
    </>
  );
}
