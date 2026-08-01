import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { CalendarClock, Info } from "lucide-react";

import { BreedBadges, BreedTraitsList } from "@/components/health/breed-traits";
import { HealthIndicatorGrid } from "@/components/health/health-indicator-card";
import { WeightChart } from "@/components/health/weight-chart";
import { Section } from "@/components/ui/section";
import { hasTraits } from "@/domain/breed";
import { buildHealthIndicators } from "@/domain/health/indicators";
import { getUpcomingDoses, getOverdueDoses } from "@/domain/health/medication";
import { formatDateTime } from "@/lib/format";
import { getPetDossier } from "@/server/queries";
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
  const dossier = await getPetDossier(petId);

  if (!dossier) notFound();

  const { pet, weights, conditions, medications, doses, events } = dossier;

  // El perfil de raza es un extra: si la API falla, `resolveBreedProfile`
  // devuelve null y los indicadores que dependen de él simplemente no salen.
  const breed = await resolveBreedProfile(pet.species, pet.breedRefId, pet.breed);

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
        <h2 className="text-lg font-semibold tracking-tight">Indicadores de salud</h2>
        <p className="text-muted-foreground -mt-2 text-sm">
          Calculados a partir de lo que has registrado. No sustituyen a un diagnóstico
          veterinario.
        </p>
        <HealthIndicatorGrid indicators={indicators} />
      </section>

      {(overdue.length > 0 || upcoming.length > 0) && (
        <Section
          title="Medicación"
          description="Tomas vencidas y las próximas 24 horas."
          action={
            <Link
              href={`/mascotas/${pet.id}/medicamentos`}
              className="text-brand text-sm font-medium hover:underline"
            >
              Ver tratamientos
            </Link>
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
          <Link
            href={`/mascotas/${pet.id}/peso`}
            className="text-brand text-sm font-medium hover:underline"
          >
            Registrar peso
          </Link>
        }
      >
        <WeightChart entries={weights} breedRange={breed?.weightRange ?? null} />
      </Section>

      {breed && (
        <Section title={`Sobre la raza ${breed.name}`}>
          <div className="flex flex-col gap-4 text-sm">
            <BreedBadges breed={breed} />

            {breed.description && (
              <p className="text-muted-foreground">{breed.description}</p>
            )}
            <dl className="grid gap-3 sm:grid-cols-2">
              {breed.lifeSpan && (
                <div>
                  <dt className="text-muted-foreground text-xs">Esperanza de vida</dt>
                  <dd>
                    {breed.lifeSpan.minYears} – {breed.lifeSpan.maxYears} años
                  </dd>
                </div>
              )}
              {breed.weightBySex ? (
                <>
                  <div>
                    <dt className="text-muted-foreground text-xs">Peso típico (macho)</dt>
                    <dd>
                      {breed.weightBySex.male.minKg} – {breed.weightBySex.male.maxKg} kg
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">Peso típico (hembra)</dt>
                    <dd>
                      {breed.weightBySex.female.minKg} – {breed.weightBySex.female.maxKg} kg
                    </dd>
                  </div>
                </>
              ) : (
                breed.weightRange && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Peso típico del adulto</dt>
                    <dd>
                      {breed.weightRange.minKg} – {breed.weightRange.maxKg} kg
                    </dd>
                  </div>
                )
              )}
              {breed.temperament && (
                <div>
                  <dt className="text-muted-foreground text-xs">Temperamento</dt>
                  <dd>{breed.temperament}</dd>
                </div>
              )}
              {breed.bredFor && (
                <div>
                  <dt className="text-muted-foreground text-xs">Criado para</dt>
                  <dd>{breed.bredFor}</dd>
                </div>
              )}
              {breed.breedGroup && (
                <div>
                  <dt className="text-muted-foreground text-xs">
                    {pet.species === "cat" ? "Origen" : "Grupo"}
                  </dt>
                  <dd>{breed.breedGroup}</dd>
                </div>
              )}
            </dl>

            {hasTraits(breed) && (
              <div className="flex flex-col gap-3 border-t pt-4">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Rasgos de la raza
                </p>
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

function OverviewSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="border-border bg-card h-32 animate-pulse rounded-xl border" />
      ))}
    </div>
  );
}
