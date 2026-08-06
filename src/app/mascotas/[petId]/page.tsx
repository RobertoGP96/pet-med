import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { CalendarClock, Info } from "lucide-react";

import { BreedBadges, BreedTraitsList } from "@/components/health/breed-traits";
import { HealthIndicatorGrid } from "@/components/health/health-indicator-card";
import { IndicatorGridSkeleton } from "@/components/pets/pet-tab-skeleton";
import { WeightChart } from "@/components/health/weight-chart";
import { ActionLink } from "@/components/ui/action";
import { Eyebrow, Section } from "@/components/ui/section";
import { hasTraits } from "@/domain/breed";
import { buildHealthIndicators } from "@/domain/health/indicators";
import { getUpcomingDoses, getOverdueDoses } from "@/domain/health/medication";
import { formatDateTime } from "@/lib/format";
import { getPet, getPetOverview } from "@/server/queries";
import { resolveBreedProfile } from "@/services/breeds";

export default function PetOverviewPage({ params }: PageProps<"/mascotas/[petId]">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <ViewTransition enter="slide-up" default="none">
        <Overview params={params} />
      </ViewTransition>
    </Suspense>
  );
}

async function Overview({ params }: { params: PageProps<"/mascotas/[petId]">["params"] }) {
  const { petId } = await params;

  // `getPet` ya lo resolvió el layout de la ficha y va envuelto en `cache()`:
  // aquí no cuesta una consulta más, sólo da los datos de la raza que hacen
  // falta para lanzar la llamada externa cuanto antes.
  const pet = await getPet(petId);
  if (!pet) notFound();

  // En paralelo, no en cascada. El perfil de raza es un extra —si la API falla,
  // `resolveBreedProfile` devuelve null y los indicadores que dependen de él
  // simplemente no salen—, pero tarda lo suyo: no tiene sentido empezar a
  // pedirlo sólo cuando ya han vuelto las cinco consultas del historial.
  const [overview, breed] = await Promise.all([
    getPetOverview(petId),
    resolveBreedProfile(pet.species, pet.breedRefId, pet.breed),
  ]);

  if (!overview) notFound();

  const { weights, conditions, medications, doses, events } = overview.data;

  const now = new Date();
  const indicators = buildHealthIndicators({
    pet,
    weights,
    conditions,
    medications,
    doses,
    events,
    breed,
    now,
  });

  const overdue = getOverdueDoses(doses, now);
  const upcoming = getUpcomingDoses(doses, now, 24);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-extrabold tracking-[-0.02em]">Indicadores de salud</h2>
        <p className="text-muted-foreground -mt-2 text-sm">
          Calculados a partir de lo que has registrado. No sustituyen a un diagnóstico veterinario.
        </p>
        <HealthIndicatorGrid indicators={indicators} />
      </section>

      {(overdue.length > 0 || upcoming.length > 0) && (
        <Section
          title="Medicación"
          description="Tomas vencidas y las próximas 24 horas."
          action={
            <ActionLink href={`/mascotas/${pet.id}/medicamentos`} variant="outline">
              Ver tratamientos
            </ActionLink>
          }
        >
          <ul className="flex flex-col gap-2">
            {[...overdue, ...upcoming].slice(0, 6).map((dose) => {
              const medication = medications.find((item) => item.id === dose.medicationId);
              const isOverdue = overdue.includes(dose);

              return (
                <li
                  key={dose.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    isOverdue ? "bg-health-alert/10 text-health-alert" : "bg-muted"
                  }`}
                >
                  <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{medication?.name ?? "Medicamento"}</span>
                  <span className="text-xs">{formatDateTime(dose.scheduledAt)}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section
        title="Evolución del peso"
        action={
          <ActionLink href={`/mascotas/${pet.id}/peso`} variant="outline">
            Registrar peso
          </ActionLink>
        }
      >
        <WeightChart entries={weights} breedRange={breed?.weightRange ?? null} />
      </Section>

      {breed && (
        <Section title={`Sobre la raza ${breed.name}`}>
          <div className="flex flex-col gap-4 text-sm">
            <BreedBadges breed={breed} />

            {breed.description && <p className="text-muted-foreground">{breed.description}</p>}
            {/* Cada dato es una ficha con su rótulo en versalitas encima y un
                filete que lo separa del anterior. El filete va por celda y no
                como rejilla de `gap-px` porque el número de datos depende de lo
                que publique la API: una fila a medias dejaría un hueco de color
                de borde. */}
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {breed.lifeSpan && (
                <div className="border-border flex flex-col gap-1 border-t pt-2">
                  <dt>
                    <Eyebrow>Esperanza de vida</Eyebrow>
                  </dt>
                  <dd>
                    {breed.lifeSpan.minYears} – {breed.lifeSpan.maxYears} años
                  </dd>
                </div>
              )}
              {breed.weightBySex ? (
                <>
                  <div className="border-border flex flex-col gap-1 border-t pt-2">
                    <dt>
                      <Eyebrow>Peso típico (macho)</Eyebrow>
                    </dt>
                    <dd>
                      {breed.weightBySex.male.minKg} – {breed.weightBySex.male.maxKg} kg
                    </dd>
                  </div>
                  <div className="border-border flex flex-col gap-1 border-t pt-2">
                    <dt>
                      <Eyebrow>Peso típico (hembra)</Eyebrow>
                    </dt>
                    <dd>
                      {breed.weightBySex.female.minKg} – {breed.weightBySex.female.maxKg} kg
                    </dd>
                  </div>
                </>
              ) : (
                breed.weightRange && (
                  <div className="border-border flex flex-col gap-1 border-t pt-2">
                    <dt>
                      <Eyebrow>Peso típico del adulto</Eyebrow>
                    </dt>
                    <dd>
                      {breed.weightRange.minKg} – {breed.weightRange.maxKg} kg
                    </dd>
                  </div>
                )
              )}
              {breed.temperament && (
                <div className="border-border flex flex-col gap-1 border-t pt-2">
                  <dt>
                    <Eyebrow>Temperamento</Eyebrow>
                  </dt>
                  <dd>{breed.temperament}</dd>
                </div>
              )}
              {breed.bredFor && (
                <div className="border-border flex flex-col gap-1 border-t pt-2">
                  <dt>
                    <Eyebrow>Criado para</Eyebrow>
                  </dt>
                  <dd>{breed.bredFor}</dd>
                </div>
              )}
              {breed.breedGroup && (
                <div className="border-border flex flex-col gap-1 border-t pt-2">
                  <dt>
                    <Eyebrow>{pet.species === "cat" ? "Origen" : "Grupo"}</Eyebrow>
                  </dt>
                  <dd>{breed.breedGroup}</dd>
                </div>
              )}
            </dl>

            {hasTraits(breed) && (
              <div className="border-border flex flex-col gap-3 border-t pt-4">
                <Eyebrow>Rasgos de la raza</Eyebrow>
                <BreedTraitsList breed={breed} />
              </div>
            )}

            <p className="text-muted-foreground flex items-start gap-2 text-xs">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Datos de {pet.species === "cat" ? "The Cat API" : "dogapi.dog"}. Son valores
              orientativos de la raza, no de tu mascota en concreto.
            </p>
          </div>
        </Section>
      )}
    </div>
  );
}

/** El mismo esqueleto que sirve de `loading.tsx` de esta pestaña. */
function OverviewSkeleton() {
  return <IndicatorGridSkeleton />;
}
