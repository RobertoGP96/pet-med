/**
 * Tratamientos de la mascota, separando los vigentes de los que ya terminaron.
 *
 * A cada tratamiento vigente se le pinta la adherencia de los últimos 30 días:
 * es el dato que dice si el tratamiento se está cumpliendo de verdad.
 */

import { CalendarClock, Pill } from "lucide-react";

import { HEALTH_LEVEL_STYLES } from "@/components/health/health-ui";
import { MedicationDeleteButton } from "@/components/medications/medication-delete-button";
import { EmptyState, Eyebrow } from "@/components/ui/section";
import { MEDICATION_ROUTE_LABELS } from "@/domain/enums";
import { getAdherence, getNextDose, isMedicationCurrent } from "@/domain/health/medication";
import type { Condition, Medication, MedicationDose } from "@/domain/types";
import { formatDate, formatDateTime, formatDose, formatInterval } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MedicationList({
  medications,
  conditions,
  doses,
  petId,
}: {
  medications: Medication[];
  conditions: Condition[];
  doses: MedicationDose[];
  petId: string;
}) {
  if (medications.length === 0) {
    return (
      <EmptyState
        icon={<Pill className="size-8" />}
        title="Sin tratamientos registrados"
        description="Al registrar un tratamiento se planifican sus tomas y podrás ir marcándolas."
      />
    );
  }

  const now = new Date();
  const conditionNameById = new Map(conditions.map((condition) => [condition.id, condition.name]));

  const current = medications.filter((medication) => isMedicationCurrent(medication, now));
  const past = medications.filter((medication) => !isMedicationCurrent(medication, now));

  return (
    <div className="flex flex-col gap-6">
      {current.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="eyebrow text-muted-foreground">En curso ({current.length})</h3>
          <div className="flex flex-col gap-3">
            {current.map((medication) => (
              <MedicationCard
                key={medication.id}
                medication={medication}
                petId={petId}
                conditionName={
                  medication.conditionId
                    ? (conditionNameById.get(medication.conditionId) ?? null)
                    : null
                }
                doses={doses.filter((dose) => dose.medicationId === medication.id)}
                now={now}
                showAdherence
              />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="eyebrow text-muted-foreground">Finalizados e inactivos ({past.length})</h3>
          <div className="flex flex-col gap-3">
            {past.map((medication) => (
              <MedicationCard
                key={medication.id}
                medication={medication}
                petId={petId}
                conditionName={
                  medication.conditionId
                    ? (conditionNameById.get(medication.conditionId) ?? null)
                    : null
                }
                doses={doses.filter((dose) => dose.medicationId === medication.id)}
                now={now}
                dimmed
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MedicationCard({
  medication,
  petId,
  conditionName,
  doses,
  now,
  showAdherence = false,
  dimmed = false,
}: {
  medication: Medication;
  petId: string;
  conditionName: string | null;
  doses: MedicationDose[];
  now: Date;
  showAdherence?: boolean;
  dimmed?: boolean;
}) {
  const nextDose = showAdherence ? getNextDose(doses, now) : null;

  return (
    <article
      className={cn(
        "border-border bg-card flex flex-col gap-3 rounded-lg border p-4",
        dimmed && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="leading-tight font-extrabold tracking-[-0.02em]">{medication.name}</h4>
            {/* Rectángulo en versalitas, no píldora: es el rótulo de estado. */}
            <Eyebrow
              className={cn(
                "rounded px-2 py-1",
                medication.isActive
                  ? cn(HEALTH_LEVEL_STYLES.good.bg, HEALTH_LEVEL_STYLES.good.text)
                  : "bg-muted",
              )}
            >
              {medication.isActive ? "Activo" : "Inactivo"}
            </Eyebrow>
          </div>
          <p className="text-muted-foreground text-sm">
            {formatDose(medication.dose, medication.doseUnit)} ·{" "}
            {MEDICATION_ROUTE_LABELS[medication.route]} · {formatInterval(medication.intervalHours)}
          </p>
        </div>

        <MedicationDeleteButton id={medication.id} petId={petId} name={medication.name} />
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5">
          <CalendarClock className="size-4" aria-hidden="true" />
          {formatDate(medication.startDate)} —{" "}
          {medication.endDate ? formatDate(medication.endDate) : "sin fecha de fin"}
        </span>
        {conditionName && (
          <Eyebrow className="bg-muted rounded px-2 py-1">Trata: {conditionName}</Eyebrow>
        )}
      </div>

      {medication.instructions && (
        <p className="text-muted-foreground text-sm whitespace-pre-line">
          {medication.instructions}
        </p>
      )}

      {showAdherence && <AdherenceBar doses={doses} now={now} />}

      {nextDose && (
        <p className="text-muted-foreground text-xs">
          Próxima toma: {formatDateTime(nextDose.scheduledAt)}
        </p>
      )}
    </article>
  );
}

function AdherenceBar({ doses, now }: { doses: MedicationDose[]; now: Date }) {
  const adherence = getAdherence(doses, now);
  const styles = HEALTH_LEVEL_STYLES[adherence.level];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <Eyebrow>Adherencia (30 días)</Eyebrow>
        <span className={cn("font-extrabold", styles.text)}>
          {adherence.due > 0 ? `${adherence.percent} %` : "—"}
        </span>
      </div>

      {/* Barra rectangular y fina, como el resto de medidores del diseño. El
          relleno no va en el rojo de marca sino en el color del nivel: la
          adherencia es estado de dominio y se pinta con el mismo semáforo que
          los demás indicadores. */}
      <div
        className="bg-muted h-1.5 w-full overflow-hidden"
        role="img"
        aria-label={`Adherencia del ${adherence.percent} %: ${adherence.taken} de ${adherence.due} tomas registradas`}
      >
        <div
          className={cn("h-1.5", styles.dot)}
          style={{ width: `${adherence.due > 0 ? adherence.percent : 0}%` }}
        />
      </div>

      <p className="text-muted-foreground text-xs">{adherence.message}</p>
    </div>
  );
}
