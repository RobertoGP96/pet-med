import { PawPrint, Plus, Syringe } from "lucide-react";

import { PetSectionHeader } from "@/components/pets/pet-section-header";
import { HEALTH_LEVEL_STYLES } from "@/components/health/health-ui";
import { ActionLink } from "@/components/ui/action";
import { EmptyState, Eyebrow, Section } from "@/components/ui/section";
import { CLINICAL_EVENT_TYPE_LABELS } from "@/domain/enums";
import type { HealthLevel } from "@/domain/enums";
import { getPreventionStatus, type PreventionStatus } from "@/domain/health/prevention";
import type { ClinicalEvent } from "@/domain/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { listPreventionByPet, type PetGroup, type PetRef } from "@/server/queries";

export const metadata = {
  title: "Vacunas",
  description: "Vacunación y desparasitación de todas tus mascotas, con sus refuerzos.",
};

export const dynamic = "force-dynamic";

/** Orden en el que se atiende: primero lo vencido, al final lo que está al día. */
const LEVEL_URGENCY: Record<HealthLevel, number> = { alert: 0, watch: 1, unknown: 2, good: 3 };

export default async function VaccinesPage() {
  const groups = await listPreventionByPet();
  // Una sola lectura del reloj para toda la página: si cada tarjeta llamara a
  // `new Date()` por su cuenta, dos mascotas podrían caer a distinto lado de la
  // medianoche y una saldría «vencida hace 0 días» y otra «en 1 día».
  const now = new Date();

  const cards = groups
    .map((group) => ({
      group,
      vaccine: getPreventionStatus(group.items, "vaccine", now, "vacunación"),
      deworming: getPreventionStatus(group.items, "deworming", now, "desparasitación"),
    }))
    .sort(
      (a, b) =>
        Math.min(LEVEL_URGENCY[a.vaccine.level], LEVEL_URGENCY[a.deworming.level]) -
        Math.min(LEVEL_URGENCY[b.vaccine.level], LEVEL_URGENCY[b.deworming.level]),
    );

  const overdue = cards.filter(
    (card) => card.vaccine.level === "alert" || card.deworming.level === "alert",
  ).length;

  return (
    <div className="flex flex-col gap-8">
      <header className="border-border flex flex-col gap-3 border-b pb-5">
        <Eyebrow tone="brand">Medicina preventiva</Eyebrow>
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Vacunas</h1>
        <p className="text-muted-foreground max-w-2xl text-sm text-pretty">
          {overdue > 0
            ? `${overdue} ${overdue === 1 ? "mascota tiene" : "mascotas tienen"} algo vencido. Aparecen primero.`
            : "Vacunación y desparasitación de todas tus mascotas, con la fecha del próximo refuerzo."}
        </p>
      </header>

      {cards.length === 0 ? (
        <EmptyState
          icon={<PawPrint className="size-10" />}
          title="Todavía no hay mascotas"
          description="En cuanto des de alta una mascota y anotes una vacuna en su historia clínica, aparecerá aquí con su próximo refuerzo."
          action={
            <ActionLink href="/mascotas/nueva">
              <Plus className="size-4" />
              Añadir mascota
            </ActionLink>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {cards.map(({ group, vaccine, deworming }) => (
            <PetPreventionCard
              key={group.pet.id}
              pet={group.pet}
              group={group}
              vaccine={vaccine}
              deworming={deworming}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PetPreventionCard({
  pet,
  group,
  vaccine,
  deworming,
}: {
  pet: PetRef;
  group: PetGroup<ClinicalEvent>;
  vaccine: PreventionStatus;
  deworming: PreventionStatus;
}) {
  // Sólo las vacunas en el historial: la desparasitación ya se resume arriba y
  // mezclarlas convertiría la lista en un cajón de sastre.
  const shots = group.items.filter((event) => event.type === "vaccine").slice(0, 6);

  return (
    <Section className="flex flex-col gap-5">
      <PetSectionHeader
        pet={pet}
        href={`/mascotas/${pet.id}/historia`}
        summary={
          group.items.length === 0
            ? "Sin registros de prevención"
            : `${group.items.length} ${group.items.length === 1 ? "registro" : "registros"}`
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatusTile status={vaccine} label="Vacunación" />
        <StatusTile status={deworming} label="Desparasitación" />
      </div>

      {shots.length > 0 && (
        <div className="flex flex-col gap-2">
          <Eyebrow>Últimas vacunas</Eyebrow>
          <ul className="bg-border border-border grid list-none gap-px overflow-hidden rounded-lg border">
            {shots.map((shot) => (
              <li key={shot.id} className="bg-card flex flex-wrap items-baseline gap-x-3 px-4 py-3">
                <span className="font-extrabold tracking-[-0.02em]">{shot.title}</span>
                <span className="text-muted-foreground text-xs">
                  {formatDate(shot.occurredAt)}
                  {shot.clinic ? ` · ${shot.clinic}` : ""}
                </span>
                {shot.nextDueAt && (
                  <span className="text-muted-foreground ml-auto text-xs">
                    Refuerzo: {formatDate(shot.nextDueAt)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

/** Semáforo de un tipo de prevención. El color sale de HEALTH_LEVEL_STYLES. */
function StatusTile({ status, label }: { status: PreventionStatus; label: string }) {
  const styles = HEALTH_LEVEL_STYLES[status.level];

  return (
    <div className={cn("flex flex-col gap-1.5 rounded-lg border px-4 py-3", styles.border, styles.bg)}>
      <span className="flex items-center gap-2">
        <Syringe className={cn("size-4 shrink-0", styles.text)} aria-hidden="true" />
        <Eyebrow>{label}</Eyebrow>
      </span>

      <p className={cn("text-sm font-extrabold tracking-[-0.02em]", styles.text)}>
        {status.message}
      </p>

      {status.last && (
        <p className="text-muted-foreground text-xs">
          Última: {status.last.title} · {formatDate(status.last.occurredAt)}
        </p>
      )}
      {!status.last && (
        <p className="text-muted-foreground text-xs">
          Anótala en la historia clínica como «{CLINICAL_EVENT_TYPE_LABELS[status.type]}».
        </p>
      )}
    </div>
  );
}
